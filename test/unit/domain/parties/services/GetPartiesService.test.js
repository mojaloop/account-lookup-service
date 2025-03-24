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

const { createMockDeps, createProxyCacheMock, oracleMock, participantMock } = require('./deps')
// should be first require to mock external deps
const { GetPartiesService } = require('#src/domain/parties/services/index')
const { ERROR_MESSAGES } = require('#src/constants')
const fixtures = require('#test/fixtures/index')

const { RestMethods, Headers } = GetPartiesService.enums()

describe('GetPartiesService Tests -->', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('forwardRequestToDestination method', () => {
    test('should delete party info from oracle, if no destination DFSP in proxy mapping', async () => {
      participantMock.validateParticipant = jest.fn().mockResolvedValueOnce(false)
      const proxyCache = createProxyCacheMock({
        lookupProxyByDfspId: jest.fn().mockResolvedValueOnce(null)
      })
      const deps = createMockDeps({ proxyCache })

      const destination = 'dfsp'
      const headers = fixtures.partiesCallHeadersDto({ destination, proxy: 'proxy' })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })
      service.triggerInterSchemeDiscoveryFlow = jest.fn()

      await service.forwardRequestToDestination()

      expect(oracleMock.oracleRequest.mock.calls.length).toBe(1)
      const [sentHeaders, method, sentParams] = oracleMock.oracleRequest.mock.lastCall
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

  describe('processOraclePartyList for external participants', () => {
    const EXTERNAL_DFSP_ID = 'externalFsp'
    const PROXY_ID = 'externalProxy'
    let deps
    let proxyCache

    beforeEach(async () => {
      oracleMock.oracleRequest = jest.fn().mockResolvedValueOnce(
        fixtures.oracleRequestResponseDto({ partyList: [{ fspId: EXTERNAL_DFSP_ID }] })
      )
      participantMock.validateParticipant = jest.fn()
        .mockResolvedValueOnce(null) // source
        .mockResolvedValueOnce({}) // proxy

      proxyCache = createProxyCacheMock({
        addDfspIdToProxyMapping: jest.fn().mockResolvedValueOnce(true),
        lookupProxyByDfspId: jest.fn().mockResolvedValueOnce(PROXY_ID)
      })
      deps = createMockDeps({ proxyCache })
    })

    test('should throw ID_NOT_FOUND error and cleanup oracle, if no proxyMapping for external dfsp', async () => {
      expect.assertions(3)
      proxyCache.lookupProxyByDfspId = jest.fn().mockResolvedValueOnce(null)
      const headers = fixtures.partiesCallHeadersDto({
        destination: '', proxy: 'proxyA'
      })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
        .catch((err) => {
          expect(err).toEqual(service.createFspiopIdNotFoundError(ERROR_MESSAGES.noDiscoveryRequestsForwarded))
        })
      expect(oracleMock.oracleRequest.mock.calls.length).toBe(2) // GET + DELETE
      expect(oracleMock.oracleRequest.mock.lastCall[1]).toBe(RestMethods.DELETE)
    })

    test('should throw ID_NOT_FOUND error, if source is external', async () => {
      expect.hasAssertions()
      const headers = fixtures.partiesCallHeadersDto({
        destination: '', proxy: 'proxyA'
      })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
        .catch((err) => {
          expect(err).toEqual(service.createFspiopIdNotFoundError(ERROR_MESSAGES.noDiscoveryRequestsForwarded))
        })
    })

    test('should forward request, if source is in scheme (no proxy header)', async () => {
      participantMock.validateParticipant = jest.fn(async (fsp) => (fsp === EXTERNAL_DFSP_ID ? null : {}))
      const headers = fixtures.partiesCallHeadersDto({
        destination: '', proxy: ''
      })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
      expect(participantMock.sendRequest.mock.calls.length).toBe(1)
      const [sentHeaders, sendTo] = participantMock.sendRequest.mock.lastCall
      expect(sendTo).toEqual(PROXY_ID)
      expect(sentHeaders[Headers.FSPIOP.DESTINATION]).toBe(EXTERNAL_DFSP_ID)
    })

    test.skip('should forward request, if source is NOT in scheme', async () => {
      // todo: unskip after adding correct impl.
      const source = 'test-zm-dfsp'
      participantMock.validateParticipant = jest.fn(
        async (fsp) => ([EXTERNAL_DFSP_ID, source].includes(fsp) ? null : {})
      )
      const headers = fixtures.partiesCallHeadersDto({
        source, destination: '', proxy: 'proxy-zm'
      })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
      expect(participantMock.sendRequest.mock.calls.length).toBe(1)
      const [sentHeaders, sendTo] = participantMock.sendRequest.mock.lastCall
      expect(sendTo).toEqual(PROXY_ID)
      expect(sentHeaders[Headers.FSPIOP.DESTINATION]).toBe(EXTERNAL_DFSP_ID)
    })
  })
})
