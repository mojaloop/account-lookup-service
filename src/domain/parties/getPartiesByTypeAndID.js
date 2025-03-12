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

const oracle = require('../../models/oracle/facade')
const participant = require('../../models/participantEndpoint/facade')
const config = require('../../lib/config')
const libUtil = require('../../lib/util')
const { logger } = require('../../lib')
const { createCallbackHeaders } = require('../../lib/headers')
const { ERROR_MESSAGES } = require('../../constants')
const partiesUtils = require('./partiesUtils')

const { FspEndpointTypes, FspEndpointTemplates } = Enum.EndPoints
const { Headers, RestMethods } = Enum.Http

const proxyCacheTtlSec = 40 // todo: make configurable

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
  const component = getPartiesByTypeAndID.name
  const histTimerEnd = Metrics.getHistogram(
    component,
    'Get party by Type and Id',
    ['success']
  ).startTimer()
  const log = logger.child({ component, params })
  const proxyEnabled = !!(config.PROXY_CACHE_CONFIG.enabled && proxyCache)
  const callbackEndpointType = partiesUtils.getPartyCbType(params.SubId)
  const source = headers[Headers.FSPIOP.SOURCE]
  const proxy = proxyEnabled && headers[Headers.FSPIOP.PROXY]
  const destination = headers[Headers.FSPIOP.DESTINATION]
  // see https://github.com/mojaloop/design-authority/issues/79
  // the requester has specified a destination routing header. We should respect that and forward the request directly to the destination
  // without consulting any oracles.

  const stepState = libUtil.initStepState()
  const childSpan = span ? span.getChild(component) : undefined
  log.info('parties::getPartiesByTypeAndID start', { source, destination, proxy })

  let requester
  let fspiopError

  try {
    requester = await validateRequester({ source, proxy, proxyCache, stepState })
    const options = partiesUtils.partiesRequestOptionsDto(params)

    if (destination) {
      await forwardRequestToDestination({
        destination, headers, options, callbackEndpointType, childSpan, proxyEnabled, proxyCache, log, stepState
      })
      // stepState.inProgress('validateParticipant-1')
      // const destParticipantModel = await participant.validateParticipant(destination)
      // if (!destParticipantModel) {
      //   stepState.inProgress('lookupProxyByDfspId-2')
      //   const proxyId = proxyEnabled && await proxyCache.lookupProxyByDfspId(destination)
      //
      //   if (!proxyId) {
      //     log.warn('no destination participant, and no dfsp-to-proxy mapping', { destination })
      //     const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
      //     throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      //   }
      //   destination = proxyId
      // }
      // // all ok, go ahead and forward the request
      // stepState.inProgress('forwardRequest-3')
      // await participant.sendRequest(headers, destination, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
      //
      // histTimerEnd({ success: true })
      // log.info('discovery getPartiesByTypeAndID request was sent to destination', { destination })
      // return
      histTimerEnd({ success: true })
      return
    }

    stepState.inProgress('oracleRequest-4')
    const response = await oracle.oracleRequest(headers, method, params, query, undefined, cache)

    if (Array.isArray(response?.data?.partyList) && response.data.partyList.length > 0) {
      const partyList = filterOraclePartyList({
        response, callbackEndpointType, params, log, stepState
      })
      await processOraclePartyList({
        partyList, headers, destination, options, childSpan, callbackEndpointType, proxyEnabled, proxyCache, log, stepState
      })
      // // Oracle's API is a standard rest-style end-point Thus a GET /party on the oracle will return all participant-party records. We must filter the results based on the callbackEndpointType to make sure we remove records containing partySubIdOrType when we are in FSPIOP_CALLBACK_URL_PARTIES_GET mode:
      // let filteredResponsePartyList
      // switch (callbackEndpointType) {
      //   case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET:
      //     filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType == null) // Filter records that DON'T contain a partySubIdOrType
      //     break
      //   case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET:
      //     filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType === params.SubId) // Filter records that match partySubIdOrType
      //     break
      //   default:
      //     filteredResponsePartyList = response // Fallback to providing the standard list
      // }
      //
      // if (!Array.isArray(filteredResponsePartyList) || !filteredResponsePartyList.length) {
      //   const errMessage = 'Requested FSP/Party not found'
      //   log.warn(errMessage)
      //   throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      // }
      //
      // let sentCount = 0 // if sentCount === 0 after sending, should we restart the whole process?
      // const sending = filteredResponsePartyList.map(async party => {
      //   const { fspId } = party
      //   const clonedHeaders = { ...headers }
      //   if (!destination) {
      //     clonedHeaders[Headers.FSPIOP.DESTINATION] = fspId
      //   }
      //   stepState.inProgress('validateParticipant-5')
      //   const schemeParticipant = await participant.validateParticipant(fspId)
      //   if (schemeParticipant) {
      //     sentCount++
      //     log.verbose('participant is in scheme', { fspId })
      //     return participant.sendRequest(clonedHeaders, fspId, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
      //   }
      //
      //   // If the participant is not in the scheme and proxy routing is enabled,
      //   // we should check if there is a proxy for it and send the request to the proxy
      //   if (proxyEnabled) {
      //     stepState.inProgress('lookupProxyByDfspId-6')
      //     const proxyName = await proxyCache.lookupProxyByDfspId(fspId)
      //     if (!proxyName) {
      //       log.warn('no proxyMapping for participant!  TODO: Delete reference in oracle...', { fspId })
      //       // todo: delete reference in oracle
      //     } else {
      //       sentCount++
      //       log.verbose('participant is NOT in scheme, use proxy name', { fspId, proxyName })
      //       return participant.sendRequest(clonedHeaders, proxyName, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
      //     }
      //   }
      // })
      // stepState.inProgress('sendRequests-7') // will always be overridden by 'validateParticipant-5' or 'lookupProxyByDfspId-6'
      // await Promise.all(sending)
      // log.info('participant.sendRequests to filtered oracle partyList are done', { sentCount })
      // // todo: think what if sentCount === 0 here
    } else {
      log.info('empty partyList form oracle, getting proxies list...', { proxyEnabled, params })
      const proxyNames = await getFilteredProxyList({ config, proxy, proxyEnabled, stepState })
      // let filteredProxyNames = []
      //
      // if (proxyEnabled) {
      //   stepState.inProgress('getAllProxies-8')
      //   const proxyNames = await Util.proxies.getAllProxiesNames(config.SWITCH_ENDPOINT)
      //   filteredProxyNames = proxyNames.filter(name => name !== proxy)
      // }

      if (!proxyNames.length) {
        fspiopError = await sendErrorCallback({
          headers, params, requester, childSpan, stepState
        })
        // const callbackHeaders = createCallbackHeaders({
        //   requestHeaders: headers,
        //   partyIdType: params.Type,
        //   partyIdentifier: params.ID,
        //   endpointTemplate: params.SubId
        //     ? FspEndpointTemplates.PARTIES_SUB_ID_PUT_ERROR
        //     : FspEndpointTemplates.PARTIES_PUT_ERROR
        // })
        // fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND)
        // const errorCallbackEndpointType = partiesUtils.errorPartyCbType(params.SubId)
        // stepState.inProgress('sendErrorToParticipant-9')
        // await participant.sendErrorToParticipant(requester, errorCallbackEndpointType,
        //   fspiopError.toApiErrorObject(config.ERROR_HANDLING), callbackHeaders, params, childSpan)
      } else {
        await triggerSendToProxiesFlow({
          proxyNames, headers, params, source, callbackEndpointType, options, childSpan, proxyCache, log, stepState
        })

        // const alsReq = partiesUtils.alsRequestDto(source, params)
        // log.info('starting setSendToProxiesList flow: ', { filteredProxyNames, alsReq, proxyCacheTtlSec })
        // stepState.inProgress('setSendToProxiesList-10')
        // const isCached = await proxyCache.setSendToProxiesList(alsReq, filteredProxyNames, proxyCacheTtlSec)
        // if (!isCached) {
        //   log.warn('failed to setSendToProxiesList')
        //   throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.failedToCacheSendToProxiesList)
        // }
        //
        // stepState.inProgress('sendingProxyRequests-11')
        // const sending = filteredProxyNames.map(
        //   proxyName => participant.sendRequest(headers, proxyName, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
        //     .then(({ status, data } = {}) => ({ status, data }))
        // )
        // const results = await Promise.allSettled(sending)
        // const isOk = results.some(result => result.status === 'fulfilled')
        // // If, at least, one request is sent to proxy, we treat the whole flow as successful.
        // // Failed requests should be handled by TTL expired/timeout handler
        // // todo: - think, if we should handle failed requests here (e.g., by calling receivedErrorResponse)
        // log.info('setSendToProxiesList flow is done:', { isOk, results, filteredProxyNames, alsReq })
        // stepState.inProgress('allSent-12')
        // if (!isOk) {
        //   log.warn('no successful requests sent to proxies')
        //   throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.proxyConnectionError)
        // }
      }
    }
    log.info('parties::getPartiesByTypeAndID is done')
    histTimerEnd({ success: true })
  } catch (err) {
    fspiopError = await partiesUtils.createErrorHandlerOnSendingCallback(config, log)(err, headers, params, requester)
    histTimerEnd({ success: false })
    if (fspiopError) {
      libUtil.countFspiopError(fspiopError, { operation: component, step: stepState.step })
    }
  } finally {
    await libUtil.finishSpanWithError(childSpan, fspiopError)
  }
}

const validateRequester = async ({ source, proxy, proxyCache, stepState }) => {
  stepState.inProgress('validateRequester-0')
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

const forwardRequestToDestination = async ({
  destination, headers, options, callbackEndpointType, childSpan, proxyEnabled, proxyCache, log, stepState
}) => {
  let sendTo = destination
  stepState.inProgress('validateDestination-1')

  const destParticipantModel = await participant.validateParticipant(destination)
  if (!destParticipantModel) {
    stepState.inProgress('lookupProxyDestination-2')
    const proxyId = proxyEnabled && await proxyCache.lookupProxyByDfspId(destination)

    if (!proxyId) {
      log.warn('no destination participant, and no dfsp-to-proxy mapping', { destination })
      const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
    }
    sendTo = proxyId
  }
  // all ok, go ahead and forward the request
  stepState.inProgress('forwardRequest-3')
  await participant.sendRequest(headers, sendTo, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
  log.info('discovery getPartiesByTypeAndID request was sent', { sendTo })
}

const filterOraclePartyList = ({ response, callbackEndpointType, params, log, stepState }) => {
  // Oracle's API is a standard rest-style end-point Thus a GET /party on the oracle will return all participant-party records. We must filter the results based on the callbackEndpointType to make sure we remove records containing partySubIdOrType when we are in FSPIOP_CALLBACK_URL_PARTIES_GET mode:
  stepState.inProgress('filterOraclePartyList-5')
  let filteredResponsePartyList

  switch (callbackEndpointType) {
    case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET:
      filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType == null) // Filter records that DON'T contain a partySubIdOrType
      break
    case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET:
      filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType === params.SubId) // Filter records that match partySubIdOrType
      break
    default:
      filteredResponsePartyList = response // Fallback to providing the standard list
  }

  if (!Array.isArray(filteredResponsePartyList) || !filteredResponsePartyList.length) {
    const errMessage = 'Requested FSP/Party not found'
    log.warn(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
  }

  return filteredResponsePartyList
}

const processOraclePartyList = async ({
  partyList, headers, destination, options, childSpan, callbackEndpointType, proxyEnabled, proxyCache, log, stepState
}) => {
  let sentCount = 0 // if sentCount === 0 after sending, should we restart the whole process?
  const sending = partyList.map(async party => {
    const { fspId } = party
    const clonedHeaders = { ...headers }
    if (!destination) {
      clonedHeaders[Headers.FSPIOP.DESTINATION] = fspId
    }
    stepState.inProgress('validateParticipant-6')
    const schemeParticipant = await participant.validateParticipant(fspId)
    if (schemeParticipant) {
      sentCount++
      log.info('participant is in scheme', { fspId })
      return participant.sendRequest(clonedHeaders, fspId, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
    }

    // If the participant is not in the scheme and proxy routing is enabled,
    // we should check if there is a proxy for it and send the request to the proxy
    if (proxyEnabled) {
      stepState.inProgress('lookupProxyByDfspId-7')
      const proxyName = await proxyCache.lookupProxyByDfspId(fspId)
      if (!proxyName) {
        log.warn('no proxyMapping for participant!  TODO: Delete reference in oracle...', { fspId })
        // todo: delete reference in oracle
      } else {
        sentCount++
        log.info('participant is NOT in scheme, use proxy name', { fspId, proxyName })
        return participant.sendRequest(clonedHeaders, proxyName, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
      }
    }
  })
  await Promise.all(sending)
  log.verbose('processOraclePartyList is done', { sentCount })
  // todo: think what if sentCount === 0 here
}

const getFilteredProxyList = async ({ config, proxy, proxyEnabled, stepState }) => {
  stepState.inProgress('getAllProxies-8')
  if (!proxyEnabled) return []

  const proxyNames = await Util.proxies.getAllProxiesNames(config.SWITCH_ENDPOINT)
  return proxyNames.filter(name => name !== proxy)
}

const sendErrorCallback = async ({
  headers, params, requester, childSpan, stepState
}) => {
  stepState.inProgress('sendErrorToParticipant-9')
  const callbackHeaders = createCallbackHeaders({
    requestHeaders: headers,
    partyIdType: params.Type,
    partyIdentifier: params.ID,
    endpointTemplate: params.SubId
      ? FspEndpointTemplates.PARTIES_SUB_ID_PUT_ERROR
      : FspEndpointTemplates.PARTIES_PUT_ERROR
  })
  const fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND)

  await participant.sendErrorToParticipant(
    requester,
    partiesUtils.errorPartyCbType(params.SubId),
    fspiopError.toApiErrorObject(config.ERROR_HANDLING),
    callbackHeaders,
    params,
    childSpan
  )
  return fspiopError
}

const triggerSendToProxiesFlow = async ({
  proxyNames, headers, params, source, callbackEndpointType, options, childSpan, proxyCache, log, stepState
}) => {
  stepState.inProgress('setSendToProxiesList-10')
  const alsReq = partiesUtils.alsRequestDto(source, params)
  log.info('starting setSendToProxiesList flow: ', { proxyNames, alsReq, proxyCacheTtlSec })

  const isCached = await proxyCache.setSendToProxiesList(alsReq, proxyNames, proxyCacheTtlSec)
  if (!isCached) {
    log.warn('failed to setSendToProxiesList')
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.failedToCacheSendToProxiesList)
  }

  stepState.inProgress('sendingProxyRequests-11')
  const sending = proxyNames.map(
    proxyName => participant.sendRequest(headers, proxyName, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
      .then(({ status, data } = {}) => ({ status, data }))
  )
  const results = await Promise.allSettled(sending)
  const isOk = results.some(result => result.status === 'fulfilled')
  // If, at least, one request is sent to proxy, we treat the whole flow as successful.
  // Failed requests should be handled by TTL expired/timeout handler
  // todo: - think, if we should handle failed requests here (e.g., by calling receivedErrorResponse)
  log.info('setSendToProxiesList flow is done:', { isOk, results, proxyNames, alsReq })
  stepState.inProgress('allSent-12')
  if (!isOk) {
    log.warn('no successful requests sent to proxies')
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.proxyConnectionError)
  }
}

module.exports = getPartiesByTypeAndID
