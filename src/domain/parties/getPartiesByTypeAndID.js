/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the 2020-2025 Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 --------------
 **********/

const { Enum, Util } = require('@mojaloop/central-services-shared')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Metrics = require('@mojaloop/central-services-metrics')

const config = require('../../lib/config')
const oracle = require('../../models/oracle/facade')
const participant = require('../../models/participantEndpoint/facade')
const { createCallbackHeaders } = require('../../lib/headers')
const { ERROR_MESSAGES } = require('../../constants')
const { countFspiopError, initStepState } = require('../../lib/util')
const logger = require('../../lib').logger.child({ component: 'domain.getPartiesByTypeAndID' })
const Config = require('../../lib/config')
const utils = require('./utils')

const { FspEndpointTypes, FspEndpointTemplates } = Enum.EndPoints
const { Headers, RestMethods } = Enum.Http

const proxyCacheTtlSec = 40 // todo: make configurable

const validateRequester = async ({ source, proxy, proxyCache }) => {
  const log = logger.child({ source, method: 'validateRequester' })
  const sourceParticipant = await participant.validateParticipant(source)
  if (sourceParticipant) {
    log.debug('source is in scheme')
    return source
  }

  if (!proxy) {
    const errMessage = ERROR_MESSAGES.sourceFspNotFound
    log.warn(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
  }

  const proxyParticipant = await participant.validateParticipant(proxy)
  if (!proxyParticipant) {
    const errMessage = ERROR_MESSAGES.partyProxyNotFound
    log.warn(errMessage, { proxy })
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
  }

  const isCached = await proxyCache.addDfspIdToProxyMapping(source, proxy)
  // think, what if isCached !== true?
  log.info('source is added to proxyMapping cache:', { proxy, isCached })
  return proxy
}

/**
 * @function getPartiesByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results to a callback url
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} query - uri query parameters of the http request
 * @param {object} span
 * @param {object} cache
 * @param {IProxyCache} [proxyCache] - IProxyCache instance
 */
const getPartiesByTypeAndID = async (headers, params, method, query, span, cache, proxyCache = undefined) => {
  const histTimerEnd = Metrics.getHistogram(
    'getPartiesByTypeAndID',
    'Get party by Type and Id',
    ['success']
  ).startTimer()
  const log = logger.child({ params })
  const proxyEnabled = !!(Config.PROXY_CACHE_CONFIG.enabled && proxyCache)
  const type = params.Type
  const partySubId = params.SubId
  const callbackEndpointType = utils.getPartyCbType(partySubId)
  const source = headers[Headers.FSPIOP.SOURCE]
  const proxy = proxyEnabled && headers[Headers.FSPIOP.PROXY]
  let destination = headers[Headers.FSPIOP.DESTINATION]
  // see https://github.com/mojaloop/design-authority/issues/79
  // the requester has specified a destination routing header. We should respect that and forward the request directly to the destination
  // without consulting any oracles.

  const stepState = initStepState()
  const childSpan = span ? span.getChild('getPartiesByTypeAndID') : undefined
  log.info('parties::getPartiesByTypeAndID start', { source, destination, proxy })

  let requester
  let fspiopError

  try {
    requester = await validateRequester({ source, proxy, proxyCache })

    const options = {
      partyIdType: type,
      partyIdentifier: params.ID,
      ...(partySubId && { partySubIdOrType: partySubId })
    }

    if (destination) {
      stepState.inProgress('validateParticipant-1')
      const destParticipantModel = await participant.validateParticipant(destination)
      if (!destParticipantModel) {
        stepState.inProgress('lookupProxyByDfspId-2')
        const proxyId = proxyEnabled && await proxyCache.lookupProxyByDfspId(destination)

        if (!proxyId) {
          log.warn('no destination participant, and no dfsp-to-proxy mapping', { destination })
          const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
          throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
        }
        destination = proxyId
      }
      // all ok, go ahead and forward the request
      stepState.inProgress('forwardRequest-3')
      await participant.sendRequest(headers, destination, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)

      histTimerEnd({ success: true })
      log.info('discovery getPartiesByTypeAndID request was sent to destination', { destination })
      return
    }

    stepState.inProgress('oracleRequest-4')
    const response = await oracle.oracleRequest(headers, method, params, query, undefined, cache)
    if (Array.isArray(response?.data?.partyList) && response.data.partyList.length > 0) {
      // Oracle's API is a standard rest-style end-point Thus a GET /party on the oracle will return all participant-party records. We must filter the results based on the callbackEndpointType to make sure we remove records containing partySubIdOrType when we are in FSPIOP_CALLBACK_URL_PARTIES_GET mode:
      let filteredResponsePartyList
      switch (callbackEndpointType) {
        case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET:
          filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType == null) // Filter records that DON'T contain a partySubIdOrType
          break
        case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET:
          filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType === partySubId) // Filter records that match partySubIdOrType
          break
        default:
          filteredResponsePartyList = response // Fallback to providing the standard list
      }

      if (!Array.isArray(filteredResponsePartyList) || !filteredResponsePartyList.length) {
        const errMessage = 'Requested FSP/Party not found'
        log.warn(errMessage)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      }

      let sentCount = 0 // if sentCount === 0 after sending, should we restart the whole process?
      const sending = filteredResponsePartyList.map(async party => {
        const { fspId } = party
        const clonedHeaders = { ...headers }
        if (!destination) {
          clonedHeaders[Headers.FSPIOP.DESTINATION] = fspId
        }
        stepState.inProgress('validateParticipant-5')
        const schemeParticipant = await participant.validateParticipant(fspId)
        if (schemeParticipant) {
          sentCount++
          log.verbose('participant is in scheme', { fspId })
          return participant.sendRequest(clonedHeaders, fspId, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
        }

        // If the participant is not in the scheme and proxy routing is enabled,
        // we should check if there is a proxy for it and send the request to the proxy
        if (proxyEnabled) {
          stepState.inProgress('lookupProxyByDfspId-6')
          const proxyName = await proxyCache.lookupProxyByDfspId(fspId)
          if (!proxyName) {
            log.warn('no proxyMapping for participant!  TODO: Delete reference in oracle...', { fspId })
            // todo: delete reference in oracle
          } else {
            sentCount++
            log.verbose('participant is NOT in scheme, use proxy name', { fspId, proxyName })
            return participant.sendRequest(clonedHeaders, proxyName, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
          }
        }
      })
      stepState.inProgress('sendRequests-7') // will always be overridden by 'validateParticipant-5' or 'lookupProxyByDfspId-6'
      await Promise.all(sending)
      log.info('participant.sendRequests to filtered oracle partyList are done', { sentCount })
      // todo: think what if sentCount === 0 here
    } else {
      log.info('empty partyList form oracle, getting proxies list...', { proxyEnabled, params })
      let filteredProxyNames = []

      if (proxyEnabled) {
        stepState.inProgress('getAllProxies-8')
        const proxyNames = await Util.proxies.getAllProxiesNames(Config.SWITCH_ENDPOINT)
        filteredProxyNames = proxyNames.filter(name => name !== proxy)
      }

      if (!filteredProxyNames.length) {
        const callbackHeaders = createCallbackHeaders({
          requestHeaders: headers,
          partyIdType: type,
          partyIdentifier: params.ID,
          endpointTemplate: partySubId
            ? FspEndpointTemplates.PARTIES_SUB_ID_PUT_ERROR
            : FspEndpointTemplates.PARTIES_PUT_ERROR
        })
        fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND)
        const errorCallbackEndpointType = utils.errorPartyCbType(partySubId)
        stepState.inProgress('sendErrorToParticipant-9')
        await participant.sendErrorToParticipant(requester, errorCallbackEndpointType,
          fspiopError.toApiErrorObject(config.ERROR_HANDLING), callbackHeaders, params, childSpan)
      } else {
        const alsReq = utils.alsRequestDto(source, params)
        log.info('starting setSendToProxiesList flow: ', { filteredProxyNames, alsReq, proxyCacheTtlSec })
        stepState.inProgress('setSendToProxiesList-10')
        const isCached = await proxyCache.setSendToProxiesList(alsReq, filteredProxyNames, proxyCacheTtlSec)
        if (!isCached) {
          log.warn('failed to setSendToProxiesList')
          throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.failedToCacheSendToProxiesList)
        }

        stepState.inProgress('sendingProxyRequests-11')
        const sending = filteredProxyNames.map(
          proxyName => participant.sendRequest(headers, proxyName, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
            .then(({ status, data } = {}) => ({ status, data }))
        )
        const results = await Promise.allSettled(sending)
        const isOk = results.some(result => result.status === 'fulfilled')
        // If, at least, one request is sent to proxy, we treat the whole flow as successful.
        // Failed requests should be handled by TTL expired/timeout handler
        // todo: - think, if we should handle failed requests here (e.g., by calling receivedErrorResponse)
        log.info('setSendToProxiesList flow is done:', { isOk, results, filteredProxyNames, alsReq })
        stepState.inProgress('allSent-12')
        if (!isOk) {
          log.warn('no successful requests sent to proxies')
          throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.proxyConnectionError)
        }
      }
    }
    histTimerEnd({ success: true })
  } catch (err) {
    fspiopError = await utils.createErrorHandlerOnSendingCallback(Config, log)(err, headers, params, requester)
    histTimerEnd({ success: false })
    if (fspiopError) {
      countFspiopError(fspiopError, { operation: 'getPartiesByTypeAndID', step: stepState.step })
    }
  } finally {
    await utils.finishSpanWithError(childSpan, fspiopError)
  }
}

module.exports = getPartiesByTypeAndID
