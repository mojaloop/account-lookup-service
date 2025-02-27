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
 - Juan Correa <juan.correa@modusbox.com>
 - Miguel de Barros <miguel.debarros@modusbox.com>
 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-logger')
const Util = require('@mojaloop/central-services-shared').Util
const Enums = require('@mojaloop/central-services-shared').Enum
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const JwsSigner = require('@mojaloop/sdk-standard-components').Jws.signer
const Metrics = require('@mojaloop/central-services-metrics')
const Config = require('../../lib/config')
const { logger } = require('../../lib')
const { hubNameRegex } = require('../../lib/util').hubNameConfig

const uriRegex = /(?:^.*)(\/(participants|parties|quotes|transfers)(\/.*)*)$/

/**
 * @module src/models/participantEndpoint/facade
 */

const defineJwsSigner = (config, headers, requestedEndpoint) => {
  let jwsSigner = null

  if (config.JWS_SIGN && headers[Enums.Http.Headers.FSPIOP.SOURCE] === config.FSPIOP_SOURCE_TO_SIGN) {
    // We need below 2 headers for JWS
    headers[Enums.Http.Headers.FSPIOP.HTTP_METHOD] = headers[Enums.Http.Headers.FSPIOP.HTTP_METHOD] || Enums.Http.RestMethods.PUT
    headers[Enums.Http.Headers.FSPIOP.URI] = headers[Enums.Http.Headers.FSPIOP.URI] || uriRegex.exec(requestedEndpoint)[1]
    logger.debug('JWS is enabled, getting JwsSigner')
    jwsSigner = new JwsSigner({
      logger: Logger,
      signingKey: config.JWS_SIGNING_KEY
    })
  }

  return jwsSigner
}

/**
 * @function sendRequest
 *
 * @description it gets the applicable endpoints and sends through the response to them
 *
 * @param {object} headers - incoming http request headers
 * @param {string} requestedParticipant - the participant the request needs to be sent to
 * @param {string} endpointType - the type of endpoint being requested
 * @param {string} method - the http method
 * @param {object} payload - payload of the request being sent out
 * @param {object} options - the options to be used in the template
 * @param {object} span
 *
 * @returns {object} - Returns http response from request endpoint
 */
exports.sendRequest = async (headers, requestedParticipant, endpointType, method = undefined, payload = undefined, options = undefined, span = undefined) => {
  // Get endpoint for participant
  let requestedEndpoint
  const histTimerEndGetParticipantEndpoint = Metrics.getHistogram(
    'egress_getParticipantEndpoint',
    'Egress: Get Endpoint of participant',
    ['success', 'endpointType', 'participantName']
  ).startTimer()
  try {
    requestedEndpoint = await Util.Endpoints.getEndpoint(Config.SWITCH_ENDPOINT, requestedParticipant, endpointType, options || undefined)
    histTimerEndGetParticipantEndpoint({ success: true, endpointType, participantName: requestedParticipant })
    logger.debug('participant requestedEndpoint and endpointType: ', { requestedEndpoint, endpointType })
  } catch (err) {
    histTimerEndGetParticipantEndpoint({ success: false, endpointType, participantName: requestedParticipant })
    logger.warn('error in getEndpoint: ', err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }

  // Send request to participant
  const histTimerEndSendRequestToParticipant = Metrics.getHistogram(
    'egress_sendRequestToParticipant',
    'Egress: Send request to participant',
    ['success', 'endpointType', 'participantName']
  ).startTimer()
  try {
    // Injected Configuration for outbound Content-Type & Accept headers.
    const protocolVersions = {
      content: Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT.toString(),
      accept: Config.PROTOCOL_VERSIONS.ACCEPT.DEFAULT.toString()
    }
    const params = {
      url: requestedEndpoint,
      headers,
      source: headers[Enums.Http.Headers.FSPIOP.SOURCE],
      destination: headers[Enums.Http.Headers.FSPIOP.DESTINATION],
      method,
      payload,
      responseType: Enums.Http.ResponseTypes.JSON,
      span,
      protocolVersions,
      hubNameRegex,
      apiType: Config.API_TYPE
    }
    logger.debug('participant - sendRequest params:', { params })
    params.jwsSigner = defineJwsSigner(Config, headers, requestedEndpoint)

    const resp = await Util.Request.sendRequest(params)
    histTimerEndSendRequestToParticipant({ success: true, endpointType, participantName: requestedParticipant })
    return resp
  } catch (err) {
    histTimerEndSendRequestToParticipant({ success: false, endpointType, participantName: requestedParticipant })
    logger.warn('error in sendRequest: ', err)
    const extensions = [{
      key: 'system',
      value: '["http"]'
    }]
    throw ErrorHandler.Factory.reformatFSPIOPError(
      err,
      undefined,
      undefined,
      extensions
    )
  }
}

/**
 * @function validateParticipant
 *
 * @description sends a request to central-ledger to retrieve participant details and validate that they exist within the switch
 *
 * @param {string} fsp The FSPIOP-Source fsp id
 * @returns the participants info in a successful case and
 */
exports.validateParticipant = async (fsp) => {
  const histTimerEnd = Metrics.getHistogram(
    'egress_validateParticipant',
    'Egress: Validate participant',
    ['success']
  ).startTimer()
  try {
    const resp = await Util.Participants.getParticipant(Config.SWITCH_ENDPOINT, fsp)
    histTimerEnd({ success: true })
    return resp
  } catch (err) {
    histTimerEnd({ success: false })
    logger.warn('error in validateParticipant: ', err)
    const extensions = [{
      key: 'system',
      value: '["http"]'
    }]
    throw ErrorHandler.Factory.reformatFSPIOPError(
      err,
      undefined,
      undefined,
      extensions
    )
  }
}

/**
 * @function sendErrorToParticipant
 *
 * @description it gets the applicable endpoints and sends through an error message
 *
 * @param {string} participantName - the participant the request needs to be sent to
 * @param {string} endpointType - the type of endpoint being requested
 * @param {object} errorInformation - payload of the error information being sent out
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {object} payload - payload of the request being sent out
 * @param {object} span
 *
 * @returns {object} - Returns http response from request endpoint
 */
exports.sendErrorToParticipant = async (participantName, endpointType, errorInformation, headers, params = {}, payload = undefined, span = undefined) => {
  // Get endpoint for participant
  let requesterErrorEndpoint
  const histTimerEndGetParticipantEndpoint = Metrics.getHistogram(
    'egress_getParticipantEndpoint',
    'Egress: Get Endpoint of participant',
    ['success', 'endpointType', 'participantName']
  ).startTimer()
  try {
    const { requestId } = payload || {}

    requesterErrorEndpoint = await Util.Endpoints.getEndpoint(Config.SWITCH_ENDPOINT, participantName, endpointType, {
      partyIdType: params.Type || undefined,
      partyIdentifier: params.ID || undefined,
      partySubIdOrType: params.SubId || undefined,
      requestId
    })
    histTimerEndGetParticipantEndpoint({ success: true, endpointType, participantName })
  } catch (err) {
    histTimerEndGetParticipantEndpoint({ success: false, endpointType, participantName })
    logger.warn('error in getEndpoint: ', err)
    const extensions = [{
      key: 'system',
      value: '["http"]'
    }]
    throw ErrorHandler.Factory.reformatFSPIOPError(
      err,
      undefined,
      undefined,
      extensions
    )
  }

  // Send error to participant
  const histTimerEndSendRequestToParticipant = Metrics.getHistogram(
    'egress_sendRequestToParticipant',
    'Egress: Send request to participant',
    ['success', 'endpointType', 'participantName']
  ).startTimer()
  try {
    // Injected Configuration for outbound Content-Type & Accept headers.
    const protocolVersions = {
      content: Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT.toString(),
      accept: Config.PROTOCOL_VERSIONS.ACCEPT.DEFAULT.toString()
    }

    const clonedHeaders = { ...headers }

    if (!clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] || clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
      clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE]
      clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Config.HUB_NAME
    }

    const params = {
      url: requesterErrorEndpoint,
      headers: clonedHeaders,
      source: clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE],
      destination: clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION],
      method: Enums.Http.RestMethods.PUT,
      payload: errorInformation,
      responseType: Enums.Http.ResponseTypes.JSON,
      hubNameRegex,
      span,
      protocolVersions,
      apiType: Config.API_TYPE
    }
    logger.debug('participant - sendErrorToParticipant params: ', { params })
    params.jwsSigner = defineJwsSigner(Config, clonedHeaders, requesterErrorEndpoint)

    await Util.Request.sendRequest(params)
    histTimerEndSendRequestToParticipant({ success: true, endpointType, participantName })
  } catch (err) {
    histTimerEndSendRequestToParticipant({ success: false, endpointType, participantName })
    logger.warn('error in sendErrorToParticipant: ', err)
    const extensions = [{
      key: 'system',
      value: '["http"]'
    }]
    throw ErrorHandler.Factory.reformatFSPIOPError(
      err,
      undefined,
      undefined,
      extensions
    )
  }
}
