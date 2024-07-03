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
const hubNameRegex = require('../../lib/util').hubNameConfig.hubNameRegex
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
    Logger.isDebugEnabled && Logger.debug('JWS is enabled, getting JwsSigner')
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
    Logger.isDebugEnabled && Logger.debug(`participant endpoint url: ${requestedEndpoint} for endpoint type ${endpointType}`)
  } catch (err) {
    histTimerEndGetParticipantEndpoint({ success: false, endpointType, participantName: requestedParticipant })
    Logger.isErrorEnabled && Logger.error(err)
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
    const jwsSigner = defineJwsSigner(Config, headers, requestedEndpoint)

    const resp = await Util.Request.sendRequest({
      url: requestedEndpoint,
      headers,
      source: headers[Enums.Http.Headers.FSPIOP.SOURCE],
      destination: headers[Enums.Http.Headers.FSPIOP.DESTINATION],
      method,
      payload,
      responseType: Enums.Http.ResponseTypes.JSON,
      span,
      jwsSigner,
      protocolVersions,
      hubNameRegex
    })
    histTimerEndSendRequestToParticipant({ success: true, endpointType, participantName: requestedParticipant })
    return resp
  } catch (err) {
    histTimerEndSendRequestToParticipant({ success: false, endpointType, participantName: requestedParticipant })
    Logger.isErrorEnabled && Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * @function validateParticipant
 *
 * @description sends a request to central-ledger to retrieve participant details and validate that they exist within the switch
 *
 * @param {string} fsp The FSPIOP-Source fsp id
 * @param {object} span
 * @returns the participants info in a successful case and
 */
exports.validateParticipant = async (fsp, span = undefined) => {
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
    Logger.isErrorEnabled && Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
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
    let requestIdExists = false
    if (payload && payload.requestId) {
      requestIdExists = true
    }
    requesterErrorEndpoint = await Util.Endpoints.getEndpoint(Config.SWITCH_ENDPOINT, participantName, endpointType, {
      partyIdType: params.Type || undefined,
      partyIdentifier: params.ID || undefined,
      partySubIdOrType: params.SubId || undefined,
      requestId: requestIdExists ? payload.requestId : undefined
    })
    histTimerEndGetParticipantEndpoint({ success: true, endpointType, participantName })
  } catch (err) {
    histTimerEndGetParticipantEndpoint({ success: false, endpointType, participantName })
    Logger.isErrorEnabled && Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
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

    Logger.isDebugEnabled && Logger.debug(`participant endpoint url: ${requesterErrorEndpoint} for endpoint type ${endpointType}`)
    const jwsSigner = defineJwsSigner(Config, clonedHeaders, requesterErrorEndpoint)

    await Util.Request.sendRequest(requesterErrorEndpoint, clonedHeaders, clonedHeaders[Enums.Http.Headers.FSPIOP.SOURCE],
      clonedHeaders[Enums.Http.Headers.FSPIOP.DESTINATION], Enums.Http.RestMethods.PUT, errorInformation, Enums.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
    histTimerEndSendRequestToParticipant({ success: true, endpointType, participantName })
  } catch (err) {
    histTimerEndSendRequestToParticipant({ success: false, endpointType, participantName })
    Logger.isErrorEnabled && Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}
