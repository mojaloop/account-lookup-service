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

const participantsDomain = require('../../domain/participants') // think, how to avoid such deps on another domain
const participant = require('../../models/participantEndpoint/facade')
const { ERROR_MESSAGES } = require('../../constants')
const { loggerFactory } = require('../../lib')
const Config = require('../../lib/config')
const utils = require('./utils')
const getPartiesByTypeAndID = require('./getPartiesByTypeAndID')

const logger = loggerFactory('domain:parties')

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
  const type = params.Type
  const partySubId = params.SubId
  const source = headers[Headers.FSPIOP.SOURCE]
  const destination = headers[Headers.FSPIOP.DESTINATION]
  const proxyEnabled = !!(Config.proxyCacheConfig.enabled && proxyCache)
  logger.info('parties::putPartiesByTypeAndID::begin', { source, destination, params })

  let sendTo
  try {
    const requesterParticipant = await participant.validateParticipant(source)
    if (!requesterParticipant) {
      const proxy = proxyEnabled && headers[Headers.FSPIOP.PROXY]
      if (!proxy) {
        const errMessage = ERROR_MESSAGES.partySourceFspNotFound
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      } else {
        const isCached = await proxyCache.addDfspIdToProxyMapping(source, proxy)
        // think,if we should throw error if isCached === false?
        logger.info('addDfspIdToProxyMapping is done', { source, proxy, isCached })
      }
    }

    // todo: recheck the logic (only if )
    if (proxyEnabled) {
      const alsReq = utils.alsRequestDto(destination, params) // or source?
      const isExists = await proxyCache.receivedSuccessResponse(alsReq)
      if (!isExists) {
        logger.warn('destination is NOT in scheme, and no cached sendToProxiesList', { destination, alsReq })
        // think, if we need to throw an error here
      } else {
        const mappingPayload = {
          fspId: source
        }
        // todo: discuss these changes with Paul
        // if (destinationParticipant) {
        // await postParticipants(headers, method, params, mappingPayload, null, cache)
        // Logger.isWarnEnabled && Logger.warn(`oracle was updated ${stringify({ mappingPayload })}`)
        // }
        await participantsDomain.postParticipants(headers, method, params, mappingPayload, null, cache)
        logger.info('oracle was updated with mappingPayload', { mappingPayload, params })
      }
    }

    const destinationParticipant = await participant.validateParticipant(destination)
    if (!destinationParticipant) {
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
    await participant.sendRequest(headers, sendTo, callbackEndpointType, RestMethods.PUT, decodedPayload.body.toString(), options)

    logger.info('parties::putPartiesByTypeAndID::callback was sent', { sendTo, options })
    histTimerEnd({ success: true })
  } catch (err) {
    await utils.handleErrorOnSendingCallback(err, headers, params, sendTo)
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
  const partySubId = params.SubId
  const destination = headers[Headers.FSPIOP.DESTINATION]
  const callbackEndpointType = utils.errorPartyCbType(partySubId)
  const proxyEnabled = !!(Config.proxyCacheConfig.enabled && proxyCache)

  const childSpan = span ? span.getChild('putPartiesErrorByTypeAndID') : undefined

  let sendTo
  let fspiopError

  try {
    const proxy = proxyEnabled && headers[Headers.FSPIOP.PROXY]
    if (proxy) {
      if (isNotValidPayeeCase(payload)) {
        const swappedHeaders = utils.swapSourceDestinationHeaders(headers)
        await participantsDomain.deleteParticipants(swappedHeaders, params, RestMethods.DELETE, null, cache)
        getPartiesByTypeAndID(swappedHeaders, params, RestMethods.GET, {}, span, cache, proxyCache)
        // todo: - think if we need to send errorCallback?
        //       - or sentCallback after getPartiesByTypeAndID is done
        logger.info('notValidPayee case - deleted Participants and run getPartiesByTypeAndID:', { proxy, params, payload })
        return
      }

      const alsReq = utils.alsRequestDto(destination, params) // or source?
      const isLast = await proxyCache.receivedErrorResponse(alsReq, proxy)
      if (!isLast) {
        logger.info('got NOT last error callback from proxy:', { proxy, alsReq })
        return
      }
    }

    const destinationParticipant = await participant.validateParticipant(destination)

    if (destinationParticipant) {
      sendTo = destination
    } else {
      const proxyName = proxyEnabled && await proxyCache.lookupProxyByDfspId(destination)
      if (!proxyName) {
        const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
      }
      sendTo = proxyName
    }
    const decodedPayload = decodePayload(dataUri, { asParsed: false })
    await participant.sendErrorToParticipant(sendTo, callbackEndpointType, decodedPayload.body.toString(), headers, params, childSpan)

    logger.info('putPartiesErrorByTypeAndID callback was sent', { sendTo })
    histTimerEnd({ success: true })
  } catch (err) {
    fspiopError = await utils.handleErrorOnSendingCallback(err, headers, params, sendTo)
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
