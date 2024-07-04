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

const participant = require('../../models/participantEndpoint/facade')
// const oracle = require('../../models/oracle/facade')
// const createCallbackHeaders = require('../../lib/headers').createCallbackHeaders
const Config = require('../../lib/config')
const utils = require('./utils')

const getPartiesByTypeAndID = require('./getPartiesByTypeAndID')

// const { FspEndpointTypes } = Enums.EndPoints
// const { Headers, RestMethods } = Enums.Http

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
 */
// const getPartiesByTypeAndID = async (headers, params, method, query, span = undefined, cache) => {
//   const histTimerEnd = Metrics.getHistogram(
//     'getPartiesByTypeAndID',
//     'Get party by Type and Id',
//     ['success']
//   ).startTimer()
//   const type = params.Type
//   const partySubIdOrType = params.SubId
//   const childSpan = span ? span.getChild('getPartiesByTypeAndID') : undefined
//
//   const callbackEndpointType = utils.getPartyCbType(partySubIdOrType)
//   const errorCallbackEndpointType = utils.errorPartyCbType(partySubIdOrType)
//   Logger.isInfoEnabled && Logger.info('parties::getPartiesByTypeAndID::begin')
//
//   let fspiopError
//   try {
//     const requesterParticipantModel = await participant.validateParticipant(headers[Headers.FSPIOP.SOURCE])
//     if (!requesterParticipantModel) {
//       // todO: DISCUSS WITH VIJAY
//       //   assuming adjacent scheme participants are not participants of the scheme
//       // fspiop-proxy OR fspiop-source should be in the scheme
//       Logger.isErrorEnabled && Logger.error('Requester FSP not found')
//       throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
//     }
//
//     const options = {
//       partyIdType: type,
//       partyIdentifier: params.ID,
//       ...(partySubIdOrType && { partySubIdOrType })
//     }
//
//     // see https://github.com/mojaloop/design-authority/issues/79
//     if (headers[Headers.FSPIOP.DESTINATION]) {
//       // the requester has specifid a destination routing header. We should respect that and forward the request directly to the destination
//       // without consulting any oracles.
//
//       // first check the destination is a valid participant
//       const destParticipantModel = await participant.validateParticipant(headers[Headers.FSPIOP.DESTINATION])
//       if (!destParticipantModel) {
//         // go to proxyCache, and try to get DESTINATION info (dfsp --> proxyId)
//         // if (!fount) throw error
//         // else        proxy to proxy
//
//         Logger.isErrorEnabled && Logger.error('Destination FSP not found')
//         throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Destination FSP not found')
//       }
//
//       // all ok, go ahead and forward the request
//       await participant.sendRequest(headers, headers[Headers.FSPIOP.DESTINATION], callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
//       histTimerEnd({ success: true })
//       if (childSpan && !childSpan.isFinished) {
//         await childSpan.finish()
//       }
//       return
//     }
//
//     const response = await oracle.oracleRequest(headers, method, params, query, undefined, cache)
//     if (Array.isArray(response?.data?.partyList) && response.data.partyList.length > 0) {
//       // Oracle's API is a standard rest-style end-point Thus a GET /party on the oracle will return all participant-party records. We must filter the results based on the callbackEndpointType to make sure we remove records containing partySubIdOrType when we are in FSPIOP_CALLBACK_URL_PARTIES_GET mode:
//       let filteredResponsePartyList
//       switch (callbackEndpointType) {
//         case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET:
//           filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType == null) // Filter records that DON'T contain a partySubIdOrType
//           break
//         case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET:
//           filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType === partySubIdOrType) // Filter records that match partySubIdOrType
//           break
//         default:
//           filteredResponsePartyList = response // Fallback to providing the standard list
//       }
//
//       if (filteredResponsePartyList == null || !(Array.isArray(filteredResponsePartyList) && filteredResponsePartyList.length > 0)) {
//         Logger.isErrorEnabled && Logger.error('Requested FSP/Party not found')
//         throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requested FSP/Party not found')
//       }
//
//       for (const party of filteredResponsePartyList) {
//         const clonedHeaders = { ...headers }
//         if (!clonedHeaders[Headers.FSPIOP.DESTINATION]) {
//           clonedHeaders[Headers.FSPIOP.DESTINATION] = party.fspId
//         }
//         // if (party.fspId is NOT in scheme) go to cache, and get proxyId   ?? (if no fspId --> proxyID mapping : delete reference in oracle, and restart process(if no participants else left)  )
//         //
//         await participant.sendRequest(clonedHeaders, party.fspId, callbackEndpointType, RestMethods.GET, undefined, options, childSpan)
//       }
//       if (childSpan && !childSpan.isFinished) {
//         await childSpan.finish()
//       }
//     } else {
//       // if (no proxy) throw error (current flow)
//       // else          start the whole flow of sendingToAllProxies..
//       const callbackHeaders = createCallbackHeaders({
//         requestHeaders: headers,
//         partyIdType: params.Type,
//         partyIdentifier: params.ID,
//         endpointTemplate: partySubIdOrType ? Enums.EndPoints.FspEndpointTemplates.PARTIES_SUB_ID_PUT_ERROR : Enums.EndPoints.FspEndpointTemplates.PARTIES_PUT_ERROR
//       })
//       fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND)
//       await participant.sendErrorToParticipant(headers[Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
//         fspiopError.toApiErrorObject(Config.ERROR_HANDLING), callbackHeaders, params, childSpan)
//       await utils.finishSpanWithError(childSpan, fspiopError)
//     }
//     histTimerEnd({ success: true })
//   } catch (err) {
//     Logger.isErrorEnabled && Logger.error(err)
//     fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
//     try {
//       await participant.sendErrorToParticipant(headers[Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
//         fspiopError.toApiErrorObject(Config.ERROR_HANDLING), headers, params, childSpan)
//     } catch (exc) {
//       fspiopError = ErrorHandler.Factory.reformatFSPIOPError(exc)
//       // We can't do anything else here- we _must_ handle all errors _within_ this function because
//       // we've already sent a sync response- we cannot throw.
//       Logger.isErrorEnabled && Logger.error(exc)
//     }
//     histTimerEnd({ success: false })
//   } finally {
//     await utils.finishSpanWithError(childSpan, fspiopError)
//   }
// }

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
  const histTimerEnd = Metrics.getHistogram(
    'putPartiesByTypeAndID',
    'Put parties by type and id',
    ['success']
  ).startTimer()
  const type = params.Type
  const partySubIdOrType = params.SubId

  const callbackEndpointType = utils.putPartyCbType(partySubIdOrType)
  const errorCallbackEndpointType = utils.errorPartyCbType(partySubIdOrType)
  Logger.isInfoEnabled && Logger.info('parties::putPartiesByTypeAndID::begin')

  try {
    const requesterParticipant = await participant.validateParticipant(headers[Headers.FSPIOP.SOURCE])
    if (requesterParticipant) {
      const destinationParticipant = await participant.validateParticipant(headers[Headers.FSPIOP.DESTINATION])
      if (destinationParticipant) {
        let options = {
          partyIdType: type,
          partyIdentifier: params.ID
        }
        options = partySubIdOrType ? { ...options, partySubIdOrType } : options
        const decodedPayload = decodePayload(dataUri, { asParsed: false })
        await participant.sendRequest(headers, destinationParticipant.name, callbackEndpointType, RestMethods.PUT, decodedPayload.body.toString(), options)
        Logger.isInfoEnabled && Logger.info('parties::putPartiesByTypeAndID::end')
      } else {
        await participant.sendErrorToParticipant(headers[Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR).toApiErrorObject(Config.ERROR_HANDLING), headers, params)
      }
    } else {
      Logger.isErrorEnabled && Logger.error('Requester FSP not found')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, 'Requester FSP not found')
    }
    histTimerEnd({ success: true })
  } catch (err) {
    Logger.isErrorEnabled && Logger.error(err)
    try {
      await participant.sendErrorToParticipant(headers[Headers.FSPIOP.SOURCE], errorCallbackEndpointType,
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
      if (childSpan && !childSpan.isFinished) {
        await childSpan.finish()
      }
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
