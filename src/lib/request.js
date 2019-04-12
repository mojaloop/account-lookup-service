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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/
'use strict'

const request = require('axios')
const Logger = require('@mojaloop/central-services-shared').Logger
const util = require('./util')
/**
 * @function validateParticipant
 *
 * @description sends a request to central-ledger to retrieve participant details and validate that they exist within the switch
 *
 * @param {string} url the endpoint for the service you require
 * @param {object} headers the http headers
 * @param {string} method http method being requested i.e. GET, POST, PUT
 * @param {object} payload the body of the request being sent
 * @param {boolean} isOracle if the request is going to an oracle
 *
 *@return {object} The response for the request being sent or error object with response included
 */
const sendRequest = async (url, headers, method = 'get', payload = undefined, isOracle = false) => {
  try {
    const transformedHeaders = util.transformHeaders(headers, { httpMethod: method, sourceFsp: headers['fspiop-source'], destinationFsp: headers['fspiop-destination']}, isOracle)
    const requestOptions = {
      url,
      method: method,
      headers: transformedHeaders,
      data: payload,
      responseType: 'json'
    }
    Logger.debug(`sendRequest::request ${JSON.stringify(requestOptions)}`)
    const response = await request(requestOptions)
    Logger.debug(`Success: sendRequest::response`)
    return response
  } catch (e) {
    Logger.error(e)
    throw e
  }
}

module.exports = {
  sendRequest
}