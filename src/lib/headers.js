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

 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/
'use strict'

const Mustache = require('mustache')
const Enums = require('@mojaloop/central-services-shared').Enum
const Config = require('../lib/config')

/**
 * @function createErrorCallbackHeaders
 * @description it returns the FSPIOP headers for error callback
 * @param {object} params - parameters to the function with the shape `{ requestHeaders, partyIdType, partyIdentifier, endpointTemplate }`
 *
 * @returns {object} - FSPIOP callback headers merged with the request headers passed in `params.requestHeaders`
 */
exports.createCallbackHeaders = (params) => {
  const callbackHeaders = { ...params.requestHeaders }

  callbackHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Config.HUB_NAME
  callbackHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = params.requestHeaders[Enums.Http.Headers.FSPIOP.SOURCE]
  callbackHeaders[Enums.Http.Headers.FSPIOP.HTTP_METHOD] = Enums.Http.RestMethods.PUT
  callbackHeaders[Enums.Http.Headers.FSPIOP.URI] = Mustache.render(params.endpointTemplate, {
    partyIdType: params.partyIdType,
    partyIdentifier: params.partyIdentifier
  })

  return callbackHeaders
}
