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
const Util = require('@mojaloop/central-services-shared').Util
const Enums = require('@mojaloop/central-services-shared').Enum
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Mustache = require('mustache')
const Config = require('../../lib/config')

/**
 * @module src/models/participantEndpoint/facade
 */

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
  try {
    const requestedEndpoint = await Util.Endpoints.getEndpoint(Config.SWITCH_ENDPOINT, requestedParticipant, endpointType, options || undefined)
    Logger.debug(`participant endpoint url: ${requestedEndpoint} for endpoint type ${endpointType}`)
    return await Util.Request.sendRequest(requestedEndpoint, headers, headers[Enums.Http.Headers.FSPIOP.SOURCE], headers[Enums.Http.Headers.FSPIOP.DESTINATION], method, payload, span)
  } catch (err) {
    Logger.error(err)
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
  try {
    const requestedParticipantUrl = Mustache.render(Config.SWITCH_ENDPOINT + Enums.EndPoints.FspEndpointTemplates.PARTICIPANTS_GET, { fsp })
    Logger.debug(`validateParticipant url: ${requestedParticipantUrl}`)
    return await Util.Request.sendRequest(requestedParticipantUrl, Util.Http.SwitchDefaultHeaders(Enums.Http.Headers.FSPIOP.SWITCH.value, Enums.Http.HeaderResources.PARTICIPANTS, Enums.Http.Headers.FSPIOP.SWITCH.value), Enums.Http.Headers.FSPIOP.SWITCH.value, Enums.Http.Headers.FSPIOP.SWITCH.value, span)
  } catch (err) {
    Logger.error(err)
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
  try {
    let requestIdExists = false
    if (payload && payload.requestId) {
      requestIdExists = true
    }
    const requesterErrorEndpoint = await Util.Endpoints.getEndpoint(Config.SWITCH_ENDPOINT, participantName, endpointType, {
      partyIdType: params.Type || undefined,
      partyIdentifier: params.ID || undefined,
      partySubIdOrType: params.SubId || undefined,
      requestId: requestIdExists ? payload.requestId : undefined
    })

    if (!headers[Enums.Http.Headers.FSPIOP.DESTINATION] || headers[Enums.Http.Headers.FSPIOP.DESTINATION] === '') {
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = headers[Enums.Http.Headers.FSPIOP.SOURCE]
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = Enums.Http.Headers.FSPIOP.SWITCH.value
    }

    Logger.debug(`participant endpoint url: ${requesterErrorEndpoint} for endpoint type ${endpointType}`)
    await Util.Request.sendRequest(requesterErrorEndpoint, headers, headers[Enums.Http.Headers.FSPIOP.SOURCE], headers[Enums.Http.Headers.FSPIOP.DESTINATION], Enums.Http.RestMethods.PUT, errorInformation, span)
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}
