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

const Logger = require('@mojaloop/central-services-shared').Logger
const Cache = require('./participantEndpoint')
const request = require('../../lib/request')
const Enums = require('../../lib/enum')
const util = require('../../lib/util')
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
 * @param {object} req - initial request coming in
 * @param {string} requestedParticipant - the participant the request needs to be sent to
 * @param {string} endpointType - the type of endpoint being requested
 * @param {string} method - the http method
 * @param {object} payload - payload of the request being sent out
 * @param {object} options - the options to be used in the template
 *
 * @returns {object} - Returns http response from request endpoint
 */
exports.sendRequest = async (req, requestedParticipant, endpointType, method = undefined, payload = undefined, options = undefined) => {
  try {
    const requestedEndpoint = await Cache.getEndpoint(requestedParticipant, endpointType, options || undefined)
    Logger.debug(`participant endpoint url: ${requestedEndpoint} for endpoint type ${endpointType}`)
    return await request.sendRequest(requestedEndpoint, req.headers, method, payload)
  } catch (e) {
    throw e
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
  try {
    const requestedParticipantUrl = Mustache.render(Config.SWITCH_ENDPOINT + Enums.endpoints.participantsGet, {fsp})
    Logger.debug(`validateParticipant url: ${requestedParticipantUrl}`)
    return await request.sendRequest(requestedParticipantUrl, util.defaultHeaders(Enums.apiServices.SWITCH, Enums.resources.participants, Enums.apiServices.SWITCH))
  } catch (e) {
    Logger.error(e)
    return null
  }
}

/**
 * @function sendErrorToParticipant
 *
 * @description it gets the applicable endpoints and sends through an error message
 *
 * @param {object} req - initial request coming in
 * @param {string} participantName - the participant the request needs to be sent to
 * @param {string} endpointType - the type of endpoint being requested
 * @param {object} errorInformation - payload of the error information being sent out
 *
 * @returns {object} - Returns http response from request endpoint
 */
exports.sendErrorToParticipant = async (req, participantName, endpointType, errorInformation) => {
  let requestIdExists = false
  if(req.payload && req.payload.requestId){
    requestIdExists = true
  }
  const requesterErrorEndpoint = await Cache.getEndpoint(participantName, endpointType, {
    partyIdType: req.params.Type,
    partyIdentifier: req.params.ID,
    partySubIdOrType: req.params.SubId || undefined,
    requestId: requestIdExists ? req.payload.requestId : undefined
  })
  Logger.debug(`participant endpoint url: ${requesterErrorEndpoint} for endpoint type ${endpointType}`)
  await request.sendRequest(requesterErrorEndpoint, req.headers, Enums.restMethods.PUT, errorInformation)
}
