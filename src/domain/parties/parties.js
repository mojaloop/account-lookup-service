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

 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-logger')
const Enums = require('@mojaloop/central-services-shared').Enum
const participant = require('../../models/participantEndpoint/facade')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const oracle = require('../../models/oracle/facade')
const createCallbackHeaders = require('../../lib/headers').createCallbackHeaders
const { decodePayload } = require('@mojaloop/central-services-shared').Util.StreamingProtocol
const Config = require('../../lib/config')

/**
 * @function getPartiesByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results to a callback url
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} query - uri query parameters of the http request
 */
const getPartiesByTypeAndID = async (headers, params, method, query) => {
  try {
    Logger.info('parties::getPartiesByTypeAndID::begin')
    const type = params.Type
    const partySubIdOrType = params.SubId || undefined
    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET
    const errorCallbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
    const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
    if (requesterParticipantModel) {
      const response = await oracle.oracleRequest(headers, method, params, query)
      if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
        let options = {
          partyIdType: type,
          partyIdentifier: params.ID
        }
        options = partySubIdOrType ? { ...options, partySubIdOrType } : options
        const clonedHeaders = { ...headers }
        if (!clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION]) {
          clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = response.data.partyList[0].fspId
        }
        await participant.sendRequest(clonedHeaders, response.data.partyList[0].fspId, callbackEndpointType, Enums.Http.RestMethods.GET, undefined, options)
      } else {
        const callbackHeaders = createCallbackHeaders({
          requestHeaders: headers,
          partyIdType: params.Type,
          partyIdentifier: params.ID,
          endpointTemplate: partySubIdOrType ? Enums.EndPoints.FspEndpointTemplates.PARTIES_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTemplates.PARTIES_PUT_ERROR
        })
        await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND).toApiErrorObject(Config.ERROR_HANDLING), callbackHeaders, params)
      }
    } else {
      Logger.error('Requester FSP not found')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
    }
  } catch (err) {
    Logger.error(err)
    try {
      const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
  }
}

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
 */
const putPartiesByTypeAndID = async (headers, params, method, payload, dataUri) => {
  try {
    Logger.info('parties::putPartiesByTypeAndID::begin')
    const requesterParticipant = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
    const type = params.Type
    const partySubIdOrType = params.SubId || undefined
    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT
    const errorCallbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
    if (requesterParticipant) {
      const destinationParticipant = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION])
      if (destinationParticipant) {
        let options = {
          partyIdType: type,
          partyIdentifier: params.ID
        }
        options = partySubIdOrType ? { ...options, partySubIdOrType } : options
        const decodedPayload = decodePayload(dataUri, { asParsed: false })
        await participant.sendRequest(headers, destinationParticipant.data.name, callbackEndpointType, Enums.Http.RestMethods.PUT, decodedPayload.body.toString(), options)
        Logger.info('parties::putPartiesByTypeAndID::end')
      } else {
        await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
      }
    } else {
      Logger.error('Requester FSP not found')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
    }
  } catch (err) {
    Logger.error(err)
    try {
      const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
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
 */
const putPartiesErrorByTypeAndID = async (headers, params, payload, dataUri) => {
  try {
    const partySubIdOrType = params.SubId || undefined
    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
    const destinationParticipant = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION])
    if (destinationParticipant) {
      const decodedPayload = decodePayload(dataUri, { asParsed: false })
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION], callbackEndpointType, decodedPayload.body.toString(), headers, params)
    } else {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], callbackEndpointType,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params, payload)
    }
  } catch (err) {
    Logger.error(err)
    try {
      const callbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], callbackEndpointType,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
  }
}

module.exports = {
  getPartiesByTypeAndID,
  putPartiesByTypeAndID,
  putPartiesErrorByTypeAndID
}
