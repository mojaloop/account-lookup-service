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
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Metrics = require('@mojaloop/central-services-metrics')

const oracle = require('../../models/oracle/facade')
const participant = require('../../models/participantEndpoint/facade')
const libUtil = require('../../lib/util')
const Config = require('../../lib/config')
const { logger } = require('../../lib')
const { ERROR_MESSAGES } = require('../../constants')

const partiesUtils = require('./partiesUtils')
const services = require('./services')
const { createDeps } = require('./deps')

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
  const components = putPartiesByTypeAndID.name
  const histTimerEnd = Metrics.getHistogram(
    components,
    'Put parties by type and id',
    ['success']
  ).startTimer()
  const log = logger.child({ params, components })
  const source = headers[Headers.FSPIOP.SOURCE]
  const destination = headers[Headers.FSPIOP.DESTINATION]
  const proxy = headers[Headers.FSPIOP.PROXY]
  const proxyEnabled = !!(Config.PROXY_CACHE_CONFIG.enabled && proxyCache)
  log.info('parties::putPartiesByTypeAndID start', { source, destination, proxy })

  let sendTo
  let step

  try {
    step = 'validateParticipant-1'
    const requesterParticipant = await participant.validateParticipant(source)
    if (!requesterParticipant) {
      if (!proxyEnabled || !proxy) {
        const errMessage = ERROR_MESSAGES.sourceFspNotFound
        log.warn(`${errMessage} and no proxy`)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      }
      step = 'addDfspIdToProxyMapping-1'
      const isCached = await proxyCache.addDfspIdToProxyMapping(source, proxy)
      // think,if we should throw error if isCached === false?
      log.info('addDfspIdToProxyMapping is done', { source, proxy, isCached })
    }

    if (proxyEnabled && proxy) {
      const alsReq = partiesUtils.alsRequestDto(destination, params)
      step = 'receivedSuccessResponse-2'
      const isExists = await proxyCache.receivedSuccessResponse(alsReq)
      if (!isExists) {
        log.warn('destination is NOT in scheme, and no cached sendToProxiesList', { destination, alsReq })
        // todo: think, if we need to throw an error here
      } else {
        const mappingPayload = {
          fspId: source
        }
        step = 'oracleRequest-3'
        await oracle.oracleRequest(headers, RestMethods.POST, params, null, mappingPayload, cache)
        log.info('oracle was updated with mappingPayload', { mappingPayload })
      }
    }
    step = 'validateParticipant-4'
    const destinationParticipant = await participant.validateParticipant(destination)
    if (!destinationParticipant) {
      step = 'lookupProxyByDfspId-5'
      const proxyName = proxyEnabled && await proxyCache.lookupProxyByDfspId(destination)
      if (!proxyName) {
        const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
        log.warn(errMessage)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
      }
      sendTo = proxyName
    } else {
      sendTo = destinationParticipant.name
    }

    const decodedPayload = decodePayload(dataUri, { asParsed: false })
    const callbackEndpointType = partiesUtils.putPartyCbType(params.SubId)
    const options = partiesUtils.partiesRequestOptionsDto(params)
    step = 'sendRequest-6'
    await participant.sendRequest(headers, sendTo, callbackEndpointType, RestMethods.PUT, decodedPayload.body.toString(), options)

    log.info('parties::putPartiesByTypeAndID::callback was sent', { sendTo })
    histTimerEnd({ success: true })
  } catch (err) {
    const fspiopError = await partiesUtils.createErrorHandlerOnSendingCallback(Config, log)(err, headers, params, sendTo)
    if (fspiopError) {
      libUtil.countFspiopError(fspiopError, { operation: components, step })
    }
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
  const component = putPartiesErrorByTypeAndID.name
  const histTimerEnd = Metrics.getHistogram(
    component,
    'Put parties error by type and id',
    ['success']
  ).startTimer()
  const childSpan = span ? span.getChild(component) : undefined
  const log = logger.child({ component, params })
  const stepState = libUtil.initStepState()

  const deps = createDeps({ cache, proxyCache, childSpan, log, stepState })
  const service = new services.PutPartiesErrorService(deps)
  const results = {}

  const destination = headers[Headers.FSPIOP.DESTINATION]
  const proxyEnabled = !!(Config.PROXY_CACHE_CONFIG.enabled && proxyCache)
  const proxy = proxyEnabled && headers[Headers.FSPIOP.PROXY]
  log.info('parties::putPartiesErrorByTypeAndID start', { destination, proxy })

  try {
    if (proxy) {
      const notValid = await service.checkPayee({ headers, params, payload, proxy })
      if (notValid) {
        const getPartiesService = new services.GetPartiesService(deps)
        // todo: think, if we need to remove destination header before starting new discovery
        await getPartiesService.handleRequest({ headers, params, results })
        log.info('putPartiesErrorByTypeAndID triggered new discovery flow')
        histTimerEnd({ success: true })
        return
      }

      const isLast = await service.checkLastProxyCallback({ destination, proxy, params })
      if (!isLast) {
        log.info('putPartiesErrorByTypeAndID proxy callback was processed', { proxy })
        histTimerEnd({ success: true })
        return
      }
    }

    const sendTo = await service.identifyDestinationForErrorCallback(destination)
    results.requester = sendTo
    await service.sendErrorCallbackToParticipant({ sendTo, headers, params, dataUri })

    log.info('putPartiesErrorByTypeAndID callback was sent', { sendTo })
    histTimerEnd({ success: true })
  } catch (error) {
    const { requester } = results
    results.fspiopError = await service.handleError({ error, requester, headers, params })
    if (results.fspiopError) {
      libUtil.countFspiopError(results.fspiopError, { operation: component, step: stepState.step })
    }
    histTimerEnd({ success: false })
  } finally {
    await libUtil.finishSpanWithError(childSpan, results.fspiopError)
  }
}

module.exports = {
  putPartiesByTypeAndID,
  putPartiesErrorByTypeAndID
}
