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

 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-logger')
const Enums = require('@mojaloop/central-services-shared').Enum
const participant = require('../../models/participantEndpoint/facade')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const oracle = require('../../models/oracle/facade')
const { decodePayload } = require('@mojaloop/central-services-shared').Util.StreamingProtocol

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
    const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
    if (requesterParticipantModel) {
      const response = await oracle.oracleRequest(headers, method, params, query)
      if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
        const options = {
          partyIdType: type,
          partyIdentifier: params.ID
        }
        if (!headers[Enums.Http.Headers.FSPIOP.DESTINATION] || headers[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
          headers[Enums.Http.Headers.FSPIOP.DESTINATION] = response.data.partyList[0].fspId
        }
        await participant.sendRequest(headers, response.data.partyList[0].fspId, Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET, Enums.Http.RestMethods.GET, undefined, options)
      } else {
        await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND).toApiErrorObject(), headers, params)
      }
    } else {
      Logger.error('Requester FSP not found')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
    }
  } catch (err) {
    Logger.error(err)
    try {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(), headers, params)
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
    if (requesterParticipant) {
      const destinationParticipant = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION])
      if (destinationParticipant) {
        const options = {
          partyIdType: type,
          partyIdentifier: params.ID
        }
        const decodedPayload = decodePayload(dataUri, { asParsed: false })
        await participant.sendRequest(headers, destinationParticipant.data.name, Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT, Enums.Http.RestMethods.PUT, decodedPayload.body.toString(), options)
        Logger.info('parties::putPartiesByTypeAndID::end')
      } else {
        await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR).toApiErrorObject(), headers, params)
      }
    } else {
      Logger.error('Requester FSP not found')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
    }
  } catch (err) {
    Logger.error(err)
    try {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(), headers, params)
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
    const destinationParticipant = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION])
    if (destinationParticipant) {
      const decodedPayload = decodePayload(dataUri, { asParsed: false })
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR, decodedPayload.body.toString(), headers, params)
    } else {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR).toApiErrorObject(), headers, params, payload)
    }
  } catch (err) {
    Logger.error(err)
    try {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(), headers, params)
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
