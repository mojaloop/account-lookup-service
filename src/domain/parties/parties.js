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
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Metrics = require('@mojaloop/central-services-metrics')
const stringify = require('fast-safe-stringify')

const participant = require('../../models/participantEndpoint/facade')
const { postParticipants } = require('../../domain/participants') // think, how to avoid such deps on another domain
const { ERROR_MESSAGES } = require('../../constants')
const Config = require('../../lib/config')
const utils = require('./utils')

const getPartiesByTypeAndID = require('./getPartiesByTypeAndID')

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
 * @param {IProxyCache} proxyCache - IProxyCache instance */
const putPartiesByTypeAndID = async (headers, params, method, payload, dataUri, cache, proxyCache) => {
  const histTimerEnd = Metrics.getHistogram(
    'putPartiesByTypeAndID',
    'Put parties by type and id',
    ['success']
  ).startTimer()
  const type = params.Type
  const partySubId = params.SubId
  const source = headers[Headers.FSPIOP.SOURCE]
  const destination = headers[Headers.FSPIOP.DESTINATION]
  Logger.isInfoEnabled && Logger.info('parties::putPartiesByTypeAndID::begin')

  try {
    const requesterParticipant = await participant.validateParticipant(source)
    if (!requesterParticipant) {
      const proxy = headers[Headers.FSPIOP.PROXY]
      if (!proxy) {
        const errMessage = ERROR_MESSAGES.partySourceFspNotFound
        Logger.isErrorEnabled && Logger.error(errMessage)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      } else {
        const isCached = await proxyCache.addDfspIdToProxyMapping(source, proxy)
        // todo: think, if we should throw error if isCached === false?
        Logger.isDebugEnabled && Logger.debug(`addDfspIdToProxyMapping is done: ${stringify({ source, proxy, isCached })}`)
      }
    }

    const alsReq = utils.alsRequestDto(destination, params) // or source?
    const isExists = await proxyCache.receivedSuccessResponse(alsReq)
    if (!isExists) {
      Logger.isWarnEnabled && Logger.warn(`destination is NOT in scheme, and no cached sendToProxiesList - ${stringify({ destination, alsReq })}`)
      // todo: think, if we need to throw an error here
    } else {
      // todo: add unit-tests
      const mappingPayload = {
        fspId: source
        // todo: what about currency?
      }
      await postParticipants(headers, method, params, mappingPayload, null, cache)
      Logger.isWarnEnabled && Logger.warn(`oracle was updated ${stringify({ mappingPayload })}`)
    }

    const destinationParticipant = await participant.validateParticipant(destination)
    let sentTo
    if (!destinationParticipant) {
      // todo: add unit-tests
      const proxyName = await proxyCache.lookupProxyByDfspId(destination)
      if (!proxyName) {
        const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
        Logger.isErrorEnabled && Logger.error(errMessage)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
      }
      sentTo = proxyName
    } else {
      sentTo = destinationParticipant.name
    }

    const decodedPayload = decodePayload(dataUri, { asParsed: false })
    const callbackEndpointType = utils.putPartyCbType(partySubId)
    const options = {
      partyIdType: type,
      partyIdentifier: params.ID,
      ...(partySubId && { partySubIdOrType: partySubId })
    }
    await participant.sendRequest(headers, sentTo, callbackEndpointType, RestMethods.PUT, decodedPayload.body.toString(), options)

    Logger.isInfoEnabled && Logger.info(`parties::putPartiesByTypeAndID::callback was sent - ${stringify({ sentTo, options })}`)
    histTimerEnd({ success: true })
  } catch (err) {
    Logger.isErrorEnabled && Logger.error(err)
    const errorCallbackEndpointType = utils.errorPartyCbType(partySubId)
    try {
      await participant.sendErrorToParticipant(source, errorCallbackEndpointType,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.isErrorEnabled && Logger.error(exc)
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
 */
const putPartiesErrorByTypeAndID = async (headers, params, payload, dataUri, span) => {
  const histTimerEnd = Metrics.getHistogram(
    'putPartiesErrorByTypeAndID',
    'Put parties error by type and id',
    ['success']
  ).startTimer()
  const partySubIdOrType = params.SubId
  const callbackEndpointType = utils.errorPartyCbType(partySubIdOrType)

  const childSpan = span ? span.getChild('putPartiesErrorByTypeAndID') : undefined

  let fspiopError
  try {
    const destinationParticipant = await participant.validateParticipant(headers[Headers.FSPIOP.DESTINATION])
    if (destinationParticipant) {
      const decodedPayload = decodePayload(dataUri, { asParsed: false })
      await participant.sendErrorToParticipant(headers[Headers.FSPIOP.DESTINATION], callbackEndpointType, decodedPayload.body.toString(), headers, params, childSpan)
    } else {
      fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR)
      await participant.sendErrorToParticipant(headers[Headers.FSPIOP.SOURCE], callbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, payload, childSpan)
    }
    histTimerEnd({ success: true })
  } catch (err) {
    Logger.isErrorEnabled && Logger.error(err)
    try {
      fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
      await participant.sendErrorToParticipant(headers[Headers.FSPIOP.SOURCE], callbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.isErrorEnabled && Logger.error(exc)
    }
    histTimerEnd({ success: false })
  } finally {
    await utils.finishSpanWithError(childSpan, fspiopError)
  }
}

module.exports = {
  getPartiesByTypeAndID,
  putPartiesByTypeAndID,
  putPartiesErrorByTypeAndID
}
