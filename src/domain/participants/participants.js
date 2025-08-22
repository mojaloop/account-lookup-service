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
 - Steven Oderayi <steven.oderayi@modusbox.com>
 - Juan Correa <juan.correa@modusbox.com>

 --------------
 ******/
'use strict'

const Enums = require('@mojaloop/central-services-shared').Enum
const { decodePayload } = require('@mojaloop/central-services-shared').Util.StreamingProtocol
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const EventSdk = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')

const oracle = require('../../models/oracle/facade')
const participant = require('../../models/participantEndpoint/facade')
const Config = require('../../lib/config')
const { logger } = require('../../lib')
const { ERROR_MESSAGES } = require('../../constants')
const util = require('../../lib/util')

const { FSPIOPErrorCodes } = ErrorHandler.Enums

/**
 * @function validatePathParameters
 * @description Validates that path parameters are not placeholder values like {ID} or {SubId}
 * @param {object} params - The path parameters object
 * @param {object} log - Logger instance for error logging
 * @throws {FSPIOPError} When parameters contain placeholder values
 */
const validatePathParameters = (params, log = logger) => {
  // Validate that ID is not a placeholder value
  if (params.ID && (params.ID === '{ID}' || params.ID.includes('{') || params.ID.includes('}'))) {
    const errMessage = `Invalid ID parameter: ${params.ID}. ID must not be a placeholder value`
    log.error(errMessage, { params })
    throw ErrorHandler.Factory.createFSPIOPError(
      ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
      errMessage
    )
  }

  // Validate SubId if present
  const partySubIdOrType = params.SubId
  if (partySubIdOrType && (partySubIdOrType === '{SubId}' || partySubIdOrType.includes('{') || partySubIdOrType.includes('}'))) {
    const errMessage = `Invalid SubId parameter: ${partySubIdOrType}. SubId must not be a placeholder value`
    log.error(errMessage, { params })
    throw ErrorHandler.Factory.createFSPIOPError(
      ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
      errMessage
    )
  }
}

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
const getParticipantsByTypeAndID = async (headers, params, method, query, span, cache) => {
  const childSpan = span ? span.getChild('getParticipantsByTypeAndID') : undefined
  const histTimerEnd = Metrics.getHistogram(
    'getParticipantsByTypeAndID',
    'Get participants by ID',
    ['success']
  ).startTimer()
  const log = logger.child('getParticipantsByTypeAndID')
  const type = params.Type
  const partySubIdOrType = params.SubId

  // Validate path parameters
  validatePathParameters(params, log)

  const source = headers[Enums.Http.Headers.FSPIOP.SOURCE]
  const callbackEndpointType = partySubIdOrType
    ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT
    : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT
  const errorCallbackEndpointType = params.SubId
    ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
    : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR

  let fspiopError
  let step

  try {
    log.info('processing started...', { source, params })
    step = 'validateParticipant-1'
    const requesterParticipantModel = await participant.validateParticipant(source)

    if (!requesterParticipantModel) {
      const errMessage = ERROR_MESSAGES.sourceFspNotFound
      logger.warn(errMessage, { requesterName: source })
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
    }
    step = 'oracleRequest-2'
    const response = await oracle.oracleRequest(headers, method, params, query, undefined, cache, true)
    if (response?.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
      const options = {
        partyIdType: type,
        partyIdentifier: params.ID,
        ...(partySubIdOrType && { partySubIdOrType })
      }
      const payload = {
        fspId: response.data.partyList[0].fspId
      }
      const clonedHeaders = { ...headers }
      if (!clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] || clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
        clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE]
      }
      clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Config.HUB_NAME
      step = 'sendRequest-3'
      await participant.sendRequest(
        clonedHeaders,
        source,
        callbackEndpointType,
        Enums.Http.RestMethods.PUT,
        payload,
        options,
        childSpan
      )
    } else {
      step = 'sendErrorToParticipant-4'
      await participant.sendErrorToParticipant(
        source,
        errorCallbackEndpointType,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND).toApiErrorObject(Config.ERROR_HANDLING),
        headers,
        params,
        childSpan
      )
    }
    log.info('processing finished', { source, params })

    if (childSpan && !childSpan.isFinished) {
      await childSpan.finish()
    }
  } catch (err) {
    log.warn('error in getParticipantsByTypeAndID', err)
    fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
    if (fspiopError) {
      util.countFspiopError(fspiopError, { operation: 'getParticipantsByTypeAndID', step })
    }
    try {
      await participant.sendErrorToParticipant(
        headers[Enums.Http.Headers.FSPIOP.SOURCE],
        errorCallbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING),
        headers,
        params,
        childSpan
      )
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      log.error('error in final participant.sendErrorToParticipant', exc)
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
const putParticipantsByTypeAndID = async (headers, params, method, payload, cache) => {
  const histTimerEnd = Metrics.getHistogram(
    'putParticipantsByTypeAndID',
    'Put participants by type and ID',
    ['success']
  ).startTimer()
  let step
  try {
    logger.info('putParticipantsByTypeAndID::begin')
    const type = params.Type
    const partySubIdOrType = params.SubId || undefined

    // Validate path parameters
    validatePathParameters(params)

    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT
    const errorCallbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
    if (Object.values(Enums.Accounts.PartyAccountTypes).includes(type)) {
      step = 'validateParticipant-1'
      const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
      if (requesterParticipantModel) {
        step = 'oracleRequest-2'
        const response = await oracle.oracleRequest(headers, method, params, undefined, payload, cache)
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
            clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Config.HUB_NAME
          }
          step = 'sendRequest-3'
          await participant.sendRequest(clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], callbackEndpointType, Enums.Http.RestMethods.PUT, responsePayload, options)
        } else {
          step = 'sendErrorToParticipant-4'
          await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
            ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
        }
      } else {
        logger.warn(ERROR_MESSAGES.sourceFspNotFound)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.sourceFspNotFound)
      }
    } else {
      step = 'sendErrorToParticipant-5'
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    }
    logger.info('putParticipantsByTypeAndID::end')
    histTimerEnd({ success: true })
  } catch (err) {
    logger.error('error in putParticipantsByTypeAndID:', err)
    let fspiopError
    try {
      const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      logger.error('error in participant.sendErrorToParticipant:', exc)
    }
    if (fspiopError) {
      util.countFspiopError(fspiopError, { operation: 'putParticipantsByTypeAndID', step })
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
  let step
  try {
    const partySubIdOrType = params.SubId || undefined

    // Validate path parameters
    validatePathParameters(params)

    const callbackEndpointType = partySubIdOrType
      ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
    step = 'validateParticipant-1'
    const destinationParticipant = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.DESTINATION])
    if (destinationParticipant) {
      const decodedPayload = decodePayload(dataUri, { asParsed: false })
      step = 'sendErrorToParticipant-2'
      await participant.sendErrorToParticipant(
        headers[Enums.Http.Headers.FSPIOP.DESTINATION],
        callbackEndpointType,
        decodedPayload.body.toString(),
        headers,
        params
      )
    } else {
      step = 'sendErrorToParticipant-3'
      await participant.sendErrorToParticipant(
        headers[Enums.Http.Headers.FSPIOP.SOURCE],
        callbackEndpointType,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR).toApiErrorObject(),
        headers,
        params,
        payload
      )
    }
    histTimerEnd({ success: true })
  } catch (err) {
    logger.error('error in putParticipantsErrorByTypeAndID:', err)
    try {
      const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
      const callbackEndpointType = params.SubId
        ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
        : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      await participant.sendErrorToParticipant(
        headers[Enums.Http.Headers.FSPIOP.SOURCE],
        callbackEndpointType,
        fspiopError.toApiErrorObject(),
        headers,
        params
      )
      util.countFspiopError(fspiopError, { operation: 'putParticipantsErrorByTypeAndID', step })
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      logger.error('error in participant.sendErrorToParticipant:', exc)
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
const postParticipants = async (headers, method, params, payload, span, cache) => {
  const histTimerEnd = Metrics.getHistogram(
    'postParticipants',
    'Post participants',
    ['success']
  ).startTimer()
  const childSpan = span ? span.getChild('postParticipants') : undefined
  let fspiopError
  let step
  try {
    logger.info('postParticipants::begin')
    const type = params.Type
    const partySubIdOrType = params.SubId

    // Validate path parameters
    validatePathParameters(params)

    const callbackEndpointType = partySubIdOrType
      ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT
      : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT
    const errorCallbackEndpointType = partySubIdOrType
      ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR

    if (Object.values(Enums.Accounts.PartyAccountTypes).includes(type)) {
      step = 'validateParticipant-1'
      const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], childSpan)
      if (requesterParticipantModel) {
        step = 'oracleRequest-2'
        const response = await oracle.oracleRequest(headers, method, params, undefined, payload, cache)
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
            clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Config.HUB_NAME
          }
          step = 'sendRequest-3'
          await participant.sendRequest(clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], callbackEndpointType, Enums.Http.RestMethods.PUT, responsePayload, options, childSpan)
          if (childSpan && !childSpan.isFinished) {
            await childSpan.finish()
          }
        } else {
          fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
          step = 'sendErrorToParticipant-4'
          await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
            fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
        }
      } else {
        const errMessage = ERROR_MESSAGES.sourceFspNotFound
        logger.error(errMessage)
        fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
        throw fspiopError
      }
    } else {
      fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
    }
    logger.info('postParticipants::end')
    histTimerEnd({ success: true })
  } catch (err) {
    logger.error('error in postParticipants:', err)
    fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
    if (fspiopError) {
      util.countFspiopError(fspiopError, { operation: 'postParticipants', step })
    }
    try {
      const errorCallbackEndpointType = params.SubId
        ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
        : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      logger.error('failed to handle exception in postParticipants:', exc)
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
  const requestId = requestPayload.requestId
  const log = logger.child({ context: 'postParticipantsBatch', requestId })
  const childSpan = span ? span.getChild('postParticipantsBatch') : undefined
  let fspiopError
  let step
  try {
    log.info('postParticipantsBatch::begin', { headers, requestPayload })
    const typeMap = new Map()
    const overallReturnList = []
    const pushPartyError = (party, errCode) => {
      log.debug('party error details:', { party, errCode })
      overallReturnList.push({
        partyId: party,
        ...ErrorHandler.Factory.createFSPIOPError(errCode, undefined, undefined, undefined, [{
          key: party.partyIdType,
          value: party.partyIdentifier
        }]).toApiErrorObject(Config.ERROR_HANDLING)
      })
    }
    step = 'validateParticipant-1'
    const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], childSpan)
    if (!requesterParticipantModel) {
      const errMessage = ERROR_MESSAGES.sourceFspNotFound
      log.error(errMessage)
      fspiopError = ErrorHandler.Factory.createFSPIOPError(FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      throw fspiopError
    }

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
          pushPartyError(party, FSPIOPErrorCodes.PARTY_NOT_FOUND)
        }
      } else {
        pushPartyError(party, FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
      }
    }

    for (const [key, value] of typeMap) {
      const payload = {
        requestId,
        partyList: value
      }
      log.info(`postParticipantsBatch::oracleBatchRequest::type=${key}`, { payload })
      step = 'oracleBatchRequest-2'
      const response = await oracle.oracleBatchRequest(headers, method, requestPayload, key, payload)
      if (Array.isArray(response?.data?.partyList) && response.data.partyList.length > 0) {
        for (const party of response.data.partyList) {
          party.partyId.currency = undefined
          overallReturnList.push(party)
        }
      } else {
        for (const party of value) {
          pushPartyError(party, FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR)
        }
      }
    }

    const payload = {
      partyList: overallReturnList,
      currency: requestPayload.currency
    }
    const clonedHeaders = { ...headers }
    if (!clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] || clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
      clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = headers[Enums.Http.Headers.FSPIOP.SOURCE]
      clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Config.HUB_NAME
    }
    await participant.sendRequest(clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT, Enums.Http.RestMethods.PUT, payload, { requestId }, childSpan)
    if (childSpan && !childSpan.isFinished) {
      await childSpan.finish()
    }
    log.info('postParticipantsBatch::end')

    histTimerEnd({ success: true })
  } catch (err) {
    log.error('error in postParticipantsBatch', err)
    fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    if (fspiopError) {
      util.countFspiopError(fspiopError, { operation: 'postParticipantsBatch', step })
    }
    try {
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT_ERROR,
        fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, undefined, requestPayload)
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      log.error('error in participant.sendErrorToParticipant', exc)
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
const deleteParticipants = async (headers, params, method, query, cache) => {
  const histTimerEnd = Metrics.getHistogram(
    'deleteParticipants',
    'Delete participants',
    ['success']
  ).startTimer()
  const log = logger.child('deleteParticipants')
  let step
  try {
    log.debug('deleteParticipants::begin', { headers, params })
    const type = params.Type
    const partySubIdOrType = params.SubId || undefined

    // Validate path parameters
    validatePathParameters(params, log)

    const callbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT
    const errorCallbackEndpointType = partySubIdOrType ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
    if (Object.values(Enums.Accounts.PartyAccountTypes).includes(type)) {
      step = 'validateParticipant-1'
      const requesterParticipantModel = await participant.validateParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE])
      if (requesterParticipantModel) {
        step = 'oracleRequest-2'
        const response = await oracle.oracleRequest(headers, method, params, query, undefined, cache)
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
          clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Config.HUB_NAME
          step = 'sendRequest-3'
          await participant.sendRequest(clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], callbackEndpointType, Enums.Http.RestMethods.PUT, responsePayload, options)
        } else {
          step = 'sendErrorToParticipant-4'
          await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
            ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DELETE_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
        }
      } else {
        const errMessage = ERROR_MESSAGES.sourceFspNotFound
        log.error(errMessage)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      }
    } else {
      step = 'sendErrorToParticipant-5'
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
        ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DELETE_PARTY_INFO_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
    }
    log.info('deleteParticipants::end')
    histTimerEnd({ success: true })
  } catch (err) {
    log.error('error in deleteParticipants', err)
    try {
      const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err, ErrorHandler.Enums.FSPIOPErrorCodes.DELETE_PARTY_INFO_ERROR)
      const errorCallbackEndpointType = params.SubId ? Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      await participant.sendErrorToParticipant(headers[Enums.Http.Headers.FSPIOP.SOURCE], errorCallbackEndpointType, fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params)
      util.countFspiopError(fspiopError, { operation: 'deleteParticipants', step })
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      log.error('error in participant.sendErrorToParticipant', exc)
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
  deleteParticipants,
  validatePathParameters
}
