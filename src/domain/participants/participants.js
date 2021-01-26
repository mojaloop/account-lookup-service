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
 - Steven Oderayi <steven.oderayi@modusbox.com>
 - Juan Correa <juan.correa@modusbox.com>

 --------------
 ******/
'use strict'

const Logger = require('@mojaloop/central-services-logger')
const Enums = require('@mojaloop/central-services-shared').Enum
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const EventSdk = require('@mojaloop/event-sdk')
const { decodePayload } = require('@mojaloop/central-services-shared').Util.StreamingProtocol
const Metrics = require('@mojaloop/central-services-metrics')
const oracle = require('../../models/oracle/facade')
const participant = require('../../models/participantEndpoint/facade')
const Config = require('../../lib/config')

/**
 * @function getParticipantsByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results back to requester
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} query - uri query parameters of the http request
 * @param {object} span
 * */
const getParticipantsByTypeAndID = async (headers, params, method, query, span) => {
  const childSpan = span ? span.getChild('getParticipantsByTypeAndID') : undefined
  const histTimerEnd = Metrics.getHistogram(
    'getParticipantsByTypeAndID',
    'Get participants by ID',
    ['success']
  ).startTimer()
  const type = params.Type
  const partySubIdOrType = params.SubId || undefined
  const requesterName = headers[Enums.Http.Headers.FSPIOP.SOURCE]
  const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT
  const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
  let fspiopError
  try {
    Logger.info('getParticipantsByTypeAndID::begin')
    const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], childSpan)
    if (requesterParticipantModel) {
      const response = await oracle.oracleRequest(headers, method, params, query)
      if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
        let options = {
          partyIdType: type,
          partyIdentifier: params.ID
        }
        options = partySubIdOrType ? { ...options, partySubIdOrType } : options
        const payload = {
          fspId: response.data.partyList[0].fspId
        }
        const clonedHeaders = { ...headers }
        if (!clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] || clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
          clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE]
        }
        clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Enums.Http.Headers.FSPIOP.SWITCH.value
        await participant.sendRequest(clonedHeaders, requesterName, callbackEndpointType, Enums.Http.RestMethods.PUT, payload, options, childSpan)
      } else {
        await participant.sendErrorToParticipant(requesterName, errorCallbackEndpointType,
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND).toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
      }
      Logger.info('getParticipantsByTypeAndID::end')
    } else {
      Logger.error('Requester FSP not found')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
    }
    if (childSpan && !childSpan.isFinished) {
      childSpan.finish()
    }
  } catch (err) {
    Logger.error(err)
    fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
    try {
      const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      await participant.sendErrorToParticipant(
        headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
    } catch (exc) {
      fspiopError = ErrorHandler.Factory.reformatFSPIOPError(exc)
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
  } finally {
    if (childSpan && !childSpan.isFinished && fspiopError) {
      const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
      await childSpan.error(fspiopError, state)
      await childSpan.finish(fspiopError.message, state)
      histTimerEnd({ success: false })
    }
    histTimerEnd({ success: true })
  }
}

/**
 * @function putParticipantsByTypeAndID
 *
 * @description This informs the client of a successful result of the lookup, creation, or deletion of the FSP
 *  information related to the Party. If the FSP information is deleted, the fspId element should be empty;
 *  otherwise the element should include the FSP information for the Party.
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} payload - payload of the request being sent out
 *
 */
const putParticipantsByTypeAndID = async (headers, params, method, payload) => {
  const histTimerEnd = Metrics.getHistogram(
    'putParticipantsByTypeAndID',
    'Put participants by type and ID',
    ['success']
  ).startTimer()
  try {
    Logger.info('putParticipantsByTypeAndID::begin')
    const type = params.Type
    const partySubIdOrType = params.SubId || undefined
    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT
    const errorCallbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
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
          if (partySubIdOrType) {
            responsePayload.partyList[0].partySubIdOrType = partySubIdOrType
          }
          let options = {
            partyIdType: params.Type,
            partyIdentifier: params.ID
          }
          options = partySubIdOrType ? { ...options, partySubIdOrType } : options
          const clonedHeaders = { ...headers }
          if (!clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] || clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
            clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = payload.fspId
            clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Enums.Http.Headers.FSPIOP.SWITCH.value
          }
          await participant.sendRequest(clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], callbackEndpointType, Enums.Http.RestMethods.PUT, responsePayload, options)
        } else {
          await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
            ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
        }
      } else {
        Logger.error('Requester FSP not found')
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
      }
    } else {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    }
    Logger.info('putParticipantsByTypeAndID::end')
    histTimerEnd({ success: true })
  } catch (err) {
    Logger.error(err)
    try {
      const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
    histTimerEnd({ success: false })
  }
}

/**
 * @function putParticipantsErrorByTypeAndID
 *
 *
 * @description  If the server is unable to find, create or delete the associated FSP of the provided identity,
 *  or another processing error occurred, the error callback PUT /participants/<Type>/<ID>/error
 *  (or PUT /participants/<Type>/<ID>/<SubId>/error) is used.
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params  - uri parameters of the http request
 * @param {object} payload - payload of the request being sent out
 * @param {string} dataUri - encoded payload of the request being sent out
 */
const putParticipantsErrorByTypeAndID = async (headers, params, payload, dataUri) => {
  const histTimerEnd = Metrics.getHistogram(
    'putParticipantsErrorByTypeAndID',
    'Put participants error by type and ID',
    ['success']
  ).startTimer()
  try {
    const partySubIdOrType = params.SubId || undefined
    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
    const destinationParticipant = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION])
    if (destinationParticipant) {
      const decodedPayload = decodePayload(dataUri, { asParsed: false })
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION], callbackEndpointType, decodedPayload.body.toString(), headers, params)
    } else {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], callbackEndpointType,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR).toApiErrorObject(), headers, params, payload)
    }
    histTimerEnd({ success: true })
  } catch (err) {
    Logger.error(err)
    try {
      const callbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], callbackEndpointType,
        ErrorHandler.Factory.reformatFSPIOPError(err).toApiErrorObject(), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
    histTimerEnd({ success: false })
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
 * @param {object} span
 */
const postParticipants = async (headers, method, params, payload, span) => {
  const histTimerEnd = Metrics.getHistogram(
    'postParticipants',
    'Post participants',
    ['success']
  ).startTimer()
  const childSpan = span ? span.getChild('postParticipants') : undefined
  let fspiopError
  try {
    Logger.info('postParticipants::begin')
    const type = params.Type
    const partySubIdOrType = params.SubId
    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT
    const errorCallbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
    if (Object.values(Enums.Accounts.PartyAccountTypes).includes(type)) {
      const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], childSpan)
      if (requesterParticipantModel) {
        const response = await oracle.oracleRequest(headers, method, params, undefined, payload)
        if (response && response.status === Enums.Http.ReturnCodes.CREATED.CODE) {
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
          if (partySubIdOrType) {
            responsePayload.partyList[0].partySubIdOrType = partySubIdOrType
          }
          let options = {
            partyIdType: params.Type,
            partyIdentifier: params.ID
          }
          options = partySubIdOrType ? { ...options, partySubIdOrType } : options
          const clonedHeaders = { ...headers }
          if (!clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] || clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
            clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = payload.fspId
            clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Enums.Http.Headers.FSPIOP.SWITCH.value
          }
          await participant.sendRequest(clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], callbackEndpointType, Enums.Http.RestMethods.PUT, responsePayload, options, childSpan)
          if (childSpan && !childSpan.isFinished) {
            childSpan.finish()
          }
        } else {
          Logger.info(response )
          fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
          await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
            fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
        }
      } else {
        fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
        Logger.error('Requester FSP not found')
        throw fspiopError
      }
    } else {
      Logger.info(Object.values(Enums.Accounts.PartyAccountTypes).includes(type))
      fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
    }
    Logger.info('postParticipants::end')
    histTimerEnd({ success: true })
  } catch (err) {
    Logger.error(err)
    fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
    try {
      const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
    histTimerEnd({ success: false })
  } finally {
    if (childSpan && !childSpan.isFinished && fspiopError) {
      const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
      await childSpan.error(fspiopError, state)
      await childSpan.finish(fspiopError.message, state)
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
 * @param {object} span
 */
const postParticipantsBatch = async (headers, method, requestPayload, span) => {
  const histTimerEnd = Metrics.getHistogram(
    'postParticipantsBatch',
    'Post participants batch',
    ['success']
  ).startTimer()
  const childSpan = span ? span.getChild('postParticipantsBatch') : undefined
  let fspiopError
  try {
    Logger.info('postParticipantsBatch::begin')
    const typeMap = new Map()
    const overallReturnList = []
    const requestId = requestPayload.requestId
    const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], childSpan)
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
            }]).toApiErrorObject(Config.ERROR_HANDLING))
          }
        } else {
          overallReturnList.push(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, undefined, undefined, undefined, [{
            key: party.partyIdType,
            value: party.partyIdentifier
          }]).toApiErrorObject(Config.ERROR_HANDLING))
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
            for (const party of response.data.partyList) {
              party.partyId.currency = undefined
              overallReturnList.push(party)
            }
          } else {
            for (const party of value) {
              overallReturnList.push(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, undefined, undefined, undefined, [{
                key: party.partyIdType,
                value: party.partyIdentifier
              }]).toApiErrorObject(Config.ERROR_HANDLING))
            }
          }
        } else {
          for (const party of value) {
            overallReturnList.push(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, undefined, undefined, undefined, [{
              key: party.partyIdType,
              value: party.partyIdentifier
            }]).toApiErrorObject(Config.ERROR_HANDLING))
          }
        }
      }
      const payload = {
        partyList: overallReturnList,
        currency: requestPayload.currency
      }
      const clonedHeaders = { ...headers }
      if (!clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] || clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
        clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = payload.partyList[0].partyId.fspId
        clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Enums.Http.Headers.FSPIOP.SWITCH.value
      }
      await participant.sendRequest(clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT, Enums.Http.RestMethods.PUT, payload, { requestId }, childSpan)
      if (childSpan && !childSpan.isFinished) {
        childSpan.finish()
      }
      Logger.info('postParticipantsBatch::end')
    } else {
      Logger.error('Requester FSP not found')
      fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
      throw fspiopError
    }
    histTimerEnd({ success: true })
  } catch (err) {
    Logger.error(err)
    fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    try {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT_ERROR,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, undefined, requestPayload)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
    histTimerEnd({ success: false })
  } finally {
    if (childSpan && !childSpan.isFinished && fspiopError) {
      const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
      await childSpan.error(fspiopError, state)
      await childSpan.finish(fspiopError.message, state)
    }
  }
}

/**
 * @function deleteParticipants
 *
 * @description This sends request to all applicable oracles to delete participant(s)
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} query - uri query parameters of the http request
 *
 */
const deleteParticipants = async (headers, params, method, query) => {
  const histTimerEnd = Metrics.getHistogram(
    'deleteParticipants',
    'Delete participants',
    ['success']
  ).startTimer()
  try {
    Logger.info('deleteParticipants::begin')
    const type = params.Type
    const partySubIdOrType = params.SubId || undefined
    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT
    const errorCallbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
    if (Object.values(Enums.Accounts.PartyAccountTypes).includes(type)) {
      const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
      if (requesterParticipantModel) {
        const response = await oracle.oracleRequest(headers, method, params, query)
        if (response) {
          const responsePayload = {
            fspId: headers[Enums.Http.Headers.FSPIOP.SOURCE]
          }
          let options = {
            partyIdType: params.Type,
            partyIdentifier: params.ID
          }
          options = partySubIdOrType ? { ...options, partySubIdOrType } : options
          const clonedHeaders = { ...headers }
          clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = headers[Enums.Http.Headers.FSPIOP.SOURCE]
          clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Enums.Http.Headers.FSPIOP.SWITCH.value
          await participant.sendRequest(clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], callbackEndpointType, Enums.Http.RestMethods.PUT, responsePayload, options)
        } else {
          await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
            ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DELETE_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
        }
      } else {
        Logger.error('Requester FSP not found')
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
      }
    } else {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DELETE_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    }
    Logger.info('deleteParticipants::end')
    histTimerEnd({ success: true })
  } catch (err) {
    Logger.error(err)
    try {
      const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.DELETE_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      Logger.error(exc)
    }
    histTimerEnd({ success: false })
  }
}

module.exports = {
  getParticipantsByTypeAndID,
  putParticipantsByTypeAndID,
  putParticipantsErrorByTypeAndID,
  postParticipants,
  postParticipantsBatch,
  deleteParticipants
}
