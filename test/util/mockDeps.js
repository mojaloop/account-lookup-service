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

const fixtures = require('../fixtures')

// eslint-disable-next-line n/no-callback-literal
const processExpierdKeysFn = async (cb) => cb(fixtures.expiredCacheKeyDto())

const createProxyCacheMock = ({
  addDfspIdToProxyMapping = jest.fn(async () => true),
  isPendingCallback = jest.fn(async () => false),
  lookupProxyByDfspId = jest.fn(async () => null),
  processExpiredAlsKeys = jest.fn(processExpierdKeysFn),
  processExpiredProxyGetPartiesKeys = jest.fn(processExpierdKeysFn),
  receivedErrorResponse = jest.fn(async () => false),
  receivedSuccessResponse = jest.fn(async () => true),
  removeDfspIdFromProxyMapping = jest.fn(async () => true),
  removeProxyGetPartiesTimeout = jest.fn(async () => true),
  setProxyGetPartiesTimeout = jest.fn(async () => true),
  setSendToProxiesList = jest.fn(async () => true)
} = {}) => ({
  addDfspIdToProxyMapping,
  isPendingCallback,
  lookupProxyByDfspId,
  processExpiredAlsKeys,
  processExpiredProxyGetPartiesKeys,
  receivedErrorResponse,
  receivedSuccessResponse,
  removeDfspIdFromProxyMapping,
  removeProxyGetPartiesTimeout,
  setProxyGetPartiesTimeout,
  setSendToProxiesList
})

// @mojaloop/central-services-shared/Util/proxies
/** @returns {Proxies} */
const createProxiesUtilMock = ({
  getAllProxiesNames = jest.fn().mockResolvedValue([]),
  invalidateProxiesCache = jest.fn()
} = {}) => ({
  getAllProxiesNames,
  invalidateProxiesCache
})

const createParticipantFacadeMock = ({
  validateParticipant = jest.fn(),
  sendRequest = jest.fn(),
  sendErrorToParticipant = jest.fn()
} = {}) => ({
  validateParticipant,
  sendRequest,
  sendErrorToParticipant
})

const createOracleFacadeMock = ({
  oracleRequest = jest.fn(),
  oracleBatchRequest = jest.fn()
} = {}) => ({
  oracleRequest,
  oracleBatchRequest
})

module.exports = {
  createOracleFacadeMock,
  createParticipantFacadeMock,
  createProxyCacheMock,
  createProxiesUtilMock
}
