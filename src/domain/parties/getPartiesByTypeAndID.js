/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

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
const { loggerFactory } = require('../../lib')
const Config = require('../../lib/config')
const utils = require('./utils')

const { FspEndpointTypes, FspEndpointTemplates } = Enum.EndPoints
const { Headers, RestMethods } = Enum.Http

const logger = loggerFactory('domain:get-parties')

const proxyCacheTtlSec = 40 // todo: make configurable

const validateRequester = async ({ source, proxy, proxyCache }) => {
  const sourceParticipant = await participant.validateParticipant(source)
  if (sourceParticipant) {
    logger.debug('source is in scheme', { source })
    return source
  }

  if (!proxy) {
    const errMessage = ERROR_MESSAGES.partySourceFspNotFound
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
  }

  const proxyParticipant = await participant.validateParticipant(proxy)
  if (!proxyParticipant) {
    const errMessage = ERROR_MESSAGES.partyProxyNotFound
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
  }

  const isCached = await proxyCache.addDfspIdToProxyMapping(source, proxy)
  // think, what if isCached !== true?
  logger.info('source is added to proxyMapping cache:', { source, proxy, isCached })
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
  const proxyEnabled = !!(Config.PROXY_CACHE_CONFIG.enabled && proxyCache)
  const type = params.Type
  const partySubId = params.SubId
  const source = headers[Headers.FSPIOP.SOURCE]
  const proxy = proxyEnabled && headers[Headers.FSPIOP.PROXY]
  const callbackEndpointType = utils.getPartyCbType(partySubId)

  const childSpan = span ? span.getChild('getPartiesByTypeAndID') : undefined
  logger.info('parties::getPartiesByTypeAndID::begin', { source, proxy, params })

  let requester
  let fspiopError

  try {
    requester = await validateRequester({ source, proxy, proxyCache })

    const options = {
      partyIdType: type,
      partyIdentifier: params.ID,
      ...(partySubId && { partySubIdOrType: partySubId })
    }

    let destination = headers[Headers.FSPIOP.DESTINATION]
    // see https://github.com/mojaloop/design-authority/issues/79
    // the requester has specified a destination routing header. We should respect that and forward the request directly to the destination
    // without consulting any oracles.
    if (destination) {
      const destParticipantModel = await participant.validateParticipant(destination)
      if (!destParticipantModel) {
        const proxyId = proxyEnabled && await proxyCache.lookupProxyByDfspId(destination)

        if (!proxyId) {
          const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
          throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
        }
        destination = proxyId
      }
      // all ok, go ahead and forward the request
      await participant.sendRequest(headers, destination, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)

      histTimerEnd({ success: true })
      logger.info('discovery getPartiesByTypeAndID request was sent to destination', { destination })
      return
    }

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
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      }

      let sentCount = 0 // if sentCount === 0 after sending, should we restart the whole process?
      const sending = filteredResponsePartyList.map(async party => {
        const { fspId } = party
        const clonedHeaders = { ...headers }
        if (!destination) {
          clonedHeaders[Headers.FSPIOP.DESTINATION] = fspId
        }
        const schemeParticipant = await participant.validateParticipant(fspId)
        if (schemeParticipant) {
          sentCount++
          logger.debug('participant is in scheme', { fspId })
          return participant.sendRequest(clonedHeaders, party.fspId, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
        }

        // If the participant is not in the scheme and proxy routing is enabled,
        // we should check if there is a proxy for it and send the request to the proxy
        if (proxyEnabled) {
          const proxyName = await proxyCache.lookupProxyByDfspId(fspId)
          if (!proxyName) {
            logger.warn('no proxyMapping for participant!  TODO: Delete reference in oracle...', { fspId })
            // todo: delete reference in oracle
          } else {
            sentCount++
            logger.debug('participant NOT is in scheme, use proxy name', { fspId, proxyName })
            return participant.sendRequest(clonedHeaders, proxyName, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
          }
        }
      })
      await Promise.all(sending)
      logger.info('participant.sendRequests to filtered oracle partyList are done', { sentCount })
      // todo: think what if sentCount === 0 here
    } else {
      logger.info('empty partyList form oracle, getting proxies list...', { proxyEnabled, params })
      let filteredProxyNames = []

      if (proxyEnabled) {
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
        await participant.sendErrorToParticipant(requester, errorCallbackEndpointType,
          fspiopError.toApiErrorObject(config.ERROR_HANDLING), callbackHeaders, params, childSpan)
      } else {
        const alsReq = utils.alsRequestDto(source, params)
        logger.info('starting setSendToProxiesList flow: ', { filteredProxyNames, alsReq, proxyCacheTtlSec })
        const isCached = await proxyCache.setSendToProxiesList(alsReq, filteredProxyNames, proxyCacheTtlSec)
        if (!isCached) {
          throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.failedToCacheSendToProxiesList)
        }

        const sending = filteredProxyNames.map(
          proxyName => participant.sendRequest(headers, proxyName, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
            .then(({ status, data } = {}) => ({ status, data }))
        )
        const results = await Promise.allSettled(sending)
        const isOk = results.some(result => result.status === 'fulfilled')
        // If, at least, one request is sent to proxy, we treat the whole flow as successful.
        // Failed requests should be handled by TTL expired/timeout handler
        // todo: - think, if we should handle failed requests here (e.g., by calling receivedErrorResponse)
        logger.info('setSendToProxiesList flow is done:', { isOk, results, filteredProxyNames, alsReq })
        if (!isOk) {
          throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.proxyConnectionError)
        }
      }
    }
    histTimerEnd({ success: true })
  } catch (err) {
    fspiopError = await utils.handleErrorOnSendingCallback(err, headers, params, requester)
    histTimerEnd({ success: false })
  } finally {
    await utils.finishSpanWithError(childSpan, fspiopError)
  }
}

module.exports = getPartiesByTypeAndID
