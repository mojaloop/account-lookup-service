/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const { API_TYPES } = require('@mojaloop/central-services-shared').Util.Hapi

const ERROR_MESSAGES = Object.freeze({
  emptyFilteredPartyList: 'Empty oracle partyList, filtered based on callbackEndpointType',
  externalPartyError: 'External party error', // todo: think better message
  failedToCacheSendToProxiesList: 'Failed to cache sendToProxiesList',
  noDiscoveryRequestsForwarded: 'No discovery requests forwarded to participants',
  sourceFspNotFound: 'Requester FSP not found',
  partyDestinationFspNotFound: 'Destination FSP not found',
  partyProxyNotFound: 'Proxy not found',
  proxyConnectionError: 'Proxy connection error - no successful requests sent to proxies',
  noSuccessfulProxyDiscoveryResponses: 'No successful proxy discovery responses'
})

const HANDLER_TYPES = Object.freeze({
  TIMEOUT: 'timeout'
})

const TIMEOUT_HANDLER_DIST_LOCK_KEY = 'mutex:als-timeout-handler'

module.exports = {
  API_TYPES,
  ERROR_MESSAGES,
  HANDLER_TYPES,
  TIMEOUT_HANDLER_DIST_LOCK_KEY
}
