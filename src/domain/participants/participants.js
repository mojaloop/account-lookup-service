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

 --------------
 ******/
'use strict'

const Logger = require('@mojaloop/central-services-logger')
const Enums = require('@mojaloop/central-services-shared').Enum
const oracle = require('../../models/oracle/facade')
const participant = require('../../models/participantEndpoint/facade')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

/**
 * @function getParticipantsByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results back to requester
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} query - uri query parameters of the http request
 *
 * */
const getParticipantsByTypeAndID = async (headers, params, method, query) => {
  try {
    Logger.info('getParticipantsByTypeAndID::begin')
    const type = params.Type
    const requesterName = headers[Enums.Http.Headers.FSPIOP.SOURCE]
    const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
    if (requesterParticipantModel) {
      const response = await oracle.oracleRequest(headers, method, params, query)
      if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
        const options = {
          partyIdType: type,
          partyIdentifier: params.ID
        }
        const payload = {
          fspId: response.data.partyList[0].fspId
        }
        if (!headers[Enums.Http.Headers.FSPIOP.DESTINATION] || headers[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
          headers[Enums.Http.Headers.FSPIOP.DESTINATION] = payload.fspId
        }
        await participant.sendRequest(headers, requesterName, Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT, Enums.Http.RestMethods.PUT, payload, options)
      } else {
        await participant.sendErrorToParticipant(requesterName, Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND).toApiErrorObject(), headers, params)
      }
      Logger.info('getParticipantsByTypeAndID::end')
    } else {
      Logger.error('Requester FSP not found')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
    }
  } catch (err) {
    Logger.error(err)
    try {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
        ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
  }
}

/**
 * @function putParticipantsErrorByTypeAndID
 *
 * @description This is a callback function
 *
 */
const putParticipantsErrorByTypeAndID = async () => {
  try {
    Logger.info('Not Implemented')
  } catch (e) {
    Logger.error(e)
  }
}

/**
 * @function postParticipants
 *
 * @description This sends request to all applicable oracles to store
 *
 * @param {object} headers - incoming http request headers
 * @param {string} method - http request method
 * @param {object} params - uri parameters of the http request
 * @param {object} payload - payload of the request being sent out
 *
 */
const postParticipants = async (headers, method, params, payload) => {
  try {
    Logger.info('postParticipants::begin')
    const type = params.Type
    if (Object.values(Enums.Accounts.PartyAccountTypes).includes(type)) {
      const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
      if (requesterParticipantModel) {
        const response = await oracle.oracleRequest(headers, method, params, undefined, payload)
        if (response && response.data) {
          const responsePayload = {
            partyList: [
              {
                partyIdType: type,
                partyIdentifier: params.ID,
                fspId: payload.fspId
              }
            ],
            currency: payload.currency
          }
          const options = {
            partyIdType: params.Type,
            partyIdentifier: params.ID
          }
          if (!headers[Enums.Http.Headers.FSPIOP.DESTINATION] || headers[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
            headers[Enums.Http.Headers.FSPIOP.DESTINATION] = payload.fspId
            headers[Enums.Http.Headers.FSPIOP.SOURCE] = Enums.Http.Headers.FSPIOP.SWITCH.value
          }
          await participant.sendRequest(headers, headers[Enums.Http.Headers.FSPIOP.DESTINATION], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT, Enums.Http.RestMethods.PUT, responsePayload, options)
        } else {
          await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT,
            ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(), headers, params)
        }
      } else {
        Logger.error('Requester FSP not found')
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
      }
    } else {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(), headers, params)
    }
    Logger.info('postParticipants::end')
  } catch (err) {
    Logger.error(err)
    try {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
        ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
  }
}

/**
 * @function postParticipantsBatch
 *
 * @description This sends request to all applicable oracles to store
 *
 * @param {object} headers - incoming http request headers
 * @param {string} method - http request method
 * @param {object} requestPayload - payload of the request being sent out
 */
const postParticipantsBatch = async (headers, method, requestPayload) => {
  try {
    Logger.info('postParticipantsBatch::begin')
    const typeMap = new Map()
    const overallReturnList = []
    const requestId = requestPayload.requestId
    const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
    if (requesterParticipantModel) {
      for (const party of requestPayload.partyList) {
        if (Object.values(Enums.Accounts.PartyAccountTypes).includes(party.partyIdType)) {
          party.currency = requestPayload.currency
          if (party.fspId === headers[Enums.Http.Headers.FSPIOP.SOURCE]) {
            if (typeMap.get(party.partyIdType)) {
              const partyList = typeMap.get(party.partyIdType)
              partyList.push(party)
              typeMap.set(party.partyIdType, partyList)
            } else {
              typeMap.set(party.partyIdType, [party])
            }
          } else {
            overallReturnList.push(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND, undefined, undefined, undefined, [{
              key: party.partyIdType,
              value: party.partyIdentifier
            }]).toApiErrorObject())
          }
        } else {
          overallReturnList.push(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, undefined, undefined, undefined, [{
            key: party.partyIdType,
            value: party.partyIdentifier
          }]).toApiErrorObject())
        }
      }

      for (const [key, value] of typeMap) {
        const payload = {
          requestId: requestId,
          partyList: value
        }
        Logger.info(`postParticipantsBatch::oracleBatchRequest::type=${key}`)
        const response = await oracle.oracleBatchRequest(headers, method, requestPayload, key, payload)
        if (response && (response.data !== null || response.data !== undefined)) {
          if (Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
            console.log('iterating through response.data.partyList')
            for (const party of response.data.partyList) {
              party.partyId.currency = undefined
              overallReturnList.push(party)
            }
          } else {
            for (const party of value) {
              overallReturnList.push(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, undefined, undefined, undefined, [{
                key: party.partyIdType,
                value: party.partyIdentifier
              }]).toApiErrorObject())
            }
          }
        } else {
          for (const party of value) {
            overallReturnList.push(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, undefined, undefined, undefined, [{
              key: party.partyIdType,
              value: party.partyIdentifier
            }]).toApiErrorObject())
          }
        }
      }
      const payload = {
        partyList: overallReturnList,
        currency: requestPayload.currency
      }

      if (!headers[Enums.Http.Headers.FSPIOP.DESTINATION] || headers[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
        headers[Enums.Http.Headers.FSPIOP.DESTINATION] = payload.partyList[0].partyId.fspId
        headers[Enums.Http.Headers.FSPIOP.SOURCE] = Enums.Http.Headers.FSPIOP.SWITCH.value
      }
      await participant.sendRequest(headers, headers[Enums.Http.Headers.FSPIOP.DESTINATION], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT, Enums.Http.RestMethods.PUT, payload, { requestId })
      Logger.info('postParticipantsBatch::end')
    } else {
      Logger.error('Requester FSP not found')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
    }
  } catch (err) {
    Logger.error(err)
    try {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT_ERROR,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(), headers)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
  }
}

module.exports = {
  getParticipantsByTypeAndID,
  putParticipantsErrorByTypeAndID,
  postParticipants,
  postParticipantsBatch
}
