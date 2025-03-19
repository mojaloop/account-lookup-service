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

jest.mock('#src/models/oracle/facade')
jest.mock('#src/models/participantEndpoint/facade')

const { GetPartiesService } = require('#src/domain/parties/services/index')
const { createDeps } = require('#src/domain/parties/deps')
const { logger } = require('#src/lib/index')
const oracle = require('#src/models/oracle/facade')
const participant = require('#src/models/participantEndpoint/facade')
// const { ERROR_MESSAGES } = require('#src/constants')
const fixtures = require('#test/fixtures/index')
const mockDeps = require('#test/util/mockDeps')

const { RestMethods, Headers } = GetPartiesService.enums()

const createMockDeps = ({
  proxyCache = mockDeps.createProxyCacheMock(),
  log = logger.child({ test: true })
} = {}) => createDeps({ proxyCache, log })

describe('GetPartiesService Tests -->', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('forwardRequestToDestination method', () => {
    test('should delete party info from oracle, if no destination DFSP in proxy mapping', async () => {
      participant.validateParticipant = jest.fn().mockResolvedValueOnce(false)
      const proxyCache = mockDeps.createProxyCacheMock({
        lookupProxyByDfspId: jest.fn().mockResolvedValueOnce(null)
      })
      const deps = createMockDeps({ proxyCache })

      const destination = 'dfsp'
      const headers = fixtures.partiesCallHeadersDto({ destination, proxy: 'proxy' })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })
      service.triggerInterSchemeDiscoveryFlow = jest.fn()

      await service.forwardRequestToDestination()

      expect(oracle.oracleRequest.mock.calls.length).toBe(1)
      const [sentHeaders, method, sentParams] = oracle.oracleRequest.mock.lastCall
      expect(method).toBe(RestMethods.DELETE)
      expect(sentHeaders).toEqual(headers)
      expect(sentParams).toEqual(params)

      expect(service.triggerInterSchemeDiscoveryFlow.mock.calls.length).toBe(1)
      expect(service.triggerInterSchemeDiscoveryFlow.mock.lastCall[0]).toEqual({
        ...headers,
        [Headers.FSPIOP.DESTINATION]: undefined
      })
    })
  })
})
