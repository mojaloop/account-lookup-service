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

 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 - Henk Kodde <henk.kodde@modusbox.com>
 - Steven Oderayi <steven.oderayi@modusbox.com>
 - Juan Correa <juan.correa@modusbox.com>
 - James Bush <james.bush@modusbox.com>

 --------------
 ******/

'use strict'

const { Headers, RestMethods } = require('@mojaloop/central-services-shared').Enum.Http
const { decodePayload } = require('@mojaloop/central-services-shared').Util.StreamingProtocol
const { MojaloopApiErrorCodes } = require('@mojaloop/sdk-standard-components').Errors
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Metrics = require('@mojaloop/central-services-metrics')

const oracle = require('../../models/oracle/facade')
const participant = require('../../models/participantEndpoint/facade')
const { ERROR_MESSAGES } = require('../../constants')
const { logger } = require('../../lib')
const Config = require('../../lib/config')
const utils = require('./utils')
const getPartiesByTypeAndID = require('./getPartiesByTypeAndID')

const log = logger.child('domain:put-parties')
const handleErrorOnSendingCallback = utils.createErrorHandlerOnSendingCallback(Config, log)

/**
 * @function putPartiesByTypeAndID
 *
 * @description This sends a callback to inform participant of successful lookup
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} payload - payload of the request being sent out
 * @param {string} dataUri - encoded payload of the request being sent out
 * @param {CacheClient} cache - in-memory cache with CatboxMemory engine
 * @param {IProxyCache} [proxyCache] - IProxyCache instance
 */
const putPartiesByTypeAndID = async (headers, params, method, payload, dataUri, cache, proxyCache = undefined) => {
  const histTimerEnd = Metrics.getHistogram(
    'putPartiesByTypeAndID',
    'Put parties by type and id',
    ['success']
  ).startTimer()
  const errorCounter = Metrics.getCounter('errorCount')
  const type = params.Type
  const partySubId = params.SubId
  const source = headers[Headers.FSPIOP.SOURCE]
  const destination = headers[Headers.FSPIOP.DESTINATION]
  const proxy = headers[Headers.FSPIOP.PROXY]
  const proxyEnabled = !!(Config.PROXY_CACHE_CONFIG.enabled && proxyCache)
  log.info('parties::putPartiesByTypeAndID::begin', { source, destination, proxy, params })

  let sendTo
  let step
  try {
    step = 'validateParticipant-1'
    const requesterParticipant = await participant.validateParticipant(source)
    if (!requesterParticipant) {
      if (!proxyEnabled || !proxy) {
        const errMessage = ERROR_MESSAGES.sourceFspNotFound
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      }
      step = 'addDfspIdToProxyMapping-1'
      const isCached = await proxyCache.addDfspIdToProxyMapping(source, proxy)
      // think,if we should throw error if isCached === false?
      log.info('addDfspIdToProxyMapping is done', { source, proxy, isCached })
    }

    if (proxyEnabled && proxy) {
      const alsReq = utils.alsRequestDto(destination, params) // or source?
      step = 'receivedSuccessResponse-2'
      const isExists = await proxyCache.receivedSuccessResponse(alsReq)
      if (!isExists) {
        log.warn('destination is NOT in scheme, and no cached sendToProxiesList', { destination, alsReq })
        // think, if we need to throw an error here
      } else {
        const mappingPayload = {
          fspId: source
        }
        step = 'oracleRequest-3'
        await oracle.oracleRequest(headers, RestMethods.POST, params, null, mappingPayload, cache)
        log.info('oracle was updated with mappingPayload', { mappingPayload, params })
      }
    }
    step = 'validateParticipant-4'
    const destinationParticipant = await participant.validateParticipant(destination)
    if (!destinationParticipant) {
      step = 'lookupProxyByDfspId-5'
      const proxyName = proxyEnabled && await proxyCache.lookupProxyByDfspId(destination)
      if (!proxyName) {
        const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
      }
      sendTo = proxyName
    } else {
      sendTo = destinationParticipant.name
    }

    const decodedPayload = decodePayload(dataUri, { asParsed: false })
    const callbackEndpointType = utils.putPartyCbType(partySubId)
    const options = {
      partyIdType: type,
      partyIdentifier: params.ID,
      ...(partySubId && { partySubIdOrType: partySubId })
    }
    step = 'sendRequest-6'
    await participant.sendRequest(headers, sendTo, callbackEndpointType, RestMethods.PUT, decodedPayload.body.toString(), options)

    log.info('parties::putPartiesByTypeAndID::callback was sent', { sendTo, options })
    histTimerEnd({ success: true })
  } catch (err) {
    const fspiopError = await handleErrorOnSendingCallback(err, headers, params, sendTo)
    const extensions = err.extensions || []
    const system = extensions.find((element) => element.key === 'system')?.value || ''
    errorCounter.inc({
      code: fspiopError?.apiErrorCode?.code,
      system,
      operation: 'putPartiesByTypeAndID',
      step
    })
    histTimerEnd({ success: false })
  }
}

/**
 * @function putPartiesErrorByTypeAndID
 *
 * @description This populates the cache of endpoints
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {object} payload - payload of the request being sent out
 * @param {string} dataUri - encoded payload of the request being sent out
 * @param {object} span
 * @param {CacheClient} cache - in-memory cache with CatboxMemory engine
 * @param {IProxyCache} [proxyCache] - IProxyCache instance
 */
const putPartiesErrorByTypeAndID = async (headers, params, payload, dataUri, span, cache, proxyCache = undefined) => {
  const histTimerEnd = Metrics.getHistogram(
    'putPartiesErrorByTypeAndID',
    'Put parties error by type and id',
    ['success']
  ).startTimer()
  const errorCounter = Metrics.getCounter('errorCount')
  const partySubId = params.SubId
  const destination = headers[Headers.FSPIOP.DESTINATION]
  const callbackEndpointType = utils.errorPartyCbType(partySubId)
  const proxyEnabled = !!(Config.PROXY_CACHE_CONFIG.enabled && proxyCache)

  const childSpan = span ? span.getChild('putPartiesErrorByTypeAndID') : undefined

  let sendTo
  let fspiopError
  let step

  try {
    const proxy = proxyEnabled && headers[Headers.FSPIOP.PROXY]
    if (proxy) {
      if (isNotValidPayeeCase(payload)) {
        const swappedHeaders = utils.swapSourceDestinationHeaders(headers)
        step = 'oracleRequest-1'
        await oracle.oracleRequest(swappedHeaders, RestMethods.DELETE, params, null, null, cache)
        getPartiesByTypeAndID(swappedHeaders, params, RestMethods.GET, {}, span, cache, proxyCache)
        // todo: - think if we need to send errorCallback?
        //       - or sentCallback after getPartiesByTypeAndID is done
        log.info('notValidPayee case - deleted Participants and run getPartiesByTypeAndID:', { proxy, params, payload })
        return
      }

      const alsReq = utils.alsRequestDto(destination, params) // or source?
      step = 'receivedErrorResponse-2'
      const isLast = await proxyCache.receivedErrorResponse(alsReq, proxy)
      if (!isLast) {
        log.info('got NOT last error callback from proxy:', { proxy, alsReq })
        return
      }
    }
    step = 'validateParticipant-3'
    const destinationParticipant = await participant.validateParticipant(destination)

    if (destinationParticipant) {
      sendTo = destination
    } else {
      step = 'lookupProxyByDfspId-4'
      const proxyName = proxyEnabled && await proxyCache.lookupProxyByDfspId(destination)
      if (!proxyName) {
        const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
      }
      sendTo = proxyName
    }
    const decodedPayload = decodePayload(dataUri, { asParsed: false })
    await participant.sendErrorToParticipant(sendTo, callbackEndpointType, decodedPayload.body.toString(), headers, params, childSpan)

    log.info('putPartiesErrorByTypeAndID callback was sent', { sendTo })
    histTimerEnd({ success: true })
  } catch (err) {
    fspiopError = await handleErrorOnSendingCallback(err, headers, params, sendTo)
    const extensions = err.extensions || []
    const system = extensions.find((element) => element.key === 'system')?.value || ''
    errorCounter.inc({
      code: fspiopError?.apiErrorCode?.code,
      system,
      operation: 'putPartiesErrorByTypeAndID',
      step
    })
    histTimerEnd({ success: false })
  } finally {
    await utils.finishSpanWithError(childSpan, fspiopError)
  }
}

function isNotValidPayeeCase (payload) {
  return payload?.errorInformation?.errorCode === MojaloopApiErrorCodes.PAYEE_IDENTIFIER_NOT_VALID.code
}

module.exports = {
  getPartiesByTypeAndID,
  putPartiesByTypeAndID,
  putPartiesErrorByTypeAndID
}
