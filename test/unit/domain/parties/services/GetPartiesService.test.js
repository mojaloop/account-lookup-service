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

const { setTimeout: sleep } = require('node:timers/promises')
const {
  createMockDeps,
  createProxyCacheMock,
  createProxiesUtilMock,
  oracleMock,
  participantMock
} = require('./deps')
// ↑ should be first require to mock external deps ↑
const { GetPartiesService } = require('#src/domain/parties/services/index')
const { API_TYPES, ERROR_MESSAGES } = require('#src/constants')
const fixtures = require('#test/fixtures/index')

const { RestMethods, Headers } = GetPartiesService.enums()

describe('GetPartiesService Tests -->', () => {
  const { config } = createMockDeps()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('forwardRequestToDestination method', () => {
    test('should delete party info from oracle, if no destination DFSP in proxy mapping', async () => {
      participantMock.validateParticipant = jest.fn().mockResolvedValueOnce(null)
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

    test('should cleanup oracle and trigger interScheme discovery, if no proxyMapping for external dfsp', async () => {
      proxyCache.lookupProxyByDfspId = jest.fn().mockResolvedValueOnce(null)
      const headers = fixtures.partiesCallHeadersDto({
        destination: '', proxy: 'proxyA'
      })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })
      service.triggerInterSchemeDiscoveryFlow = jest.fn()

      await service.handleRequest()
      expect(oracleMock.oracleRequest).toHaveBeenCalledTimes(2) // GET + DELETE
      expect(oracleMock.oracleRequest.mock.lastCall[1]).toBe(RestMethods.DELETE)
      expect(service.triggerInterSchemeDiscoveryFlow).toHaveBeenCalledWith(headers)
    })

    test('should trigger interScheme discovery flow, if source is external', async () => {
      const headers = fixtures.partiesCallHeadersDto({
        destination: '', proxy: 'proxyA'
      })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })
      service.triggerInterSchemeDiscoveryFlow = jest.fn()

      await service.handleRequest()
      expect(service.triggerInterSchemeDiscoveryFlow).toHaveBeenCalledWith(headers)
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

    test('should trigger inter-scheme discovery flow, if source is NOT in scheme', async () => {
      const source = 'test-zm-dfsp'
      const proxyZm = 'proxy-zm'
      participantMock.validateParticipant = jest.fn(
        async (fsp) => ([EXTERNAL_DFSP_ID, source].includes(fsp) ? null : {})
      )
      deps.proxies.getAllProxiesNames = jest.fn().mockResolvedValueOnce([PROXY_ID, proxyZm])
      const headers = fixtures.partiesCallHeadersDto({
        source, destination: '', proxy: proxyZm
      })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
      expect(participantMock.sendRequest).toHaveBeenCalledTimes(1)
      const [sentHeaders, sendTo] = participantMock.sendRequest.mock.lastCall
      expect(sendTo).toEqual(PROXY_ID)
      expect(sentHeaders[Headers.FSPIOP.DESTINATION]).toBeUndefined()
    })
  })

  describe('triggerInterSchemeDiscoveryFlow Tests', () => {
    test('should remove proxy from proxyCache if sending request to it fails', async () => {
      expect.assertions(2)
      participantMock.sendRequest = jest.fn().mockRejectedValue(new Error('Proxy error'))
      const proxies = createProxiesUtilMock({
        getAllProxiesNames: jest.fn().mockResolvedValue(['proxy-1'])
      })
      const deps = createMockDeps({ proxies })

      const headers = fixtures.partiesCallHeadersDto({ destination: '' })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await expect(service.triggerInterSchemeDiscoveryFlow(headers))
        .rejects.toThrow(ERROR_MESSAGES.proxyConnectionError)
      expect(deps.proxyCache.receivedErrorResponse).toHaveBeenCalledTimes(1)
    })

    test('should NOT throw an error if at least one request is sent to a proxy', async () => {
      participantMock.sendRequest = jest.fn()
        .mockRejectedValueOnce(new Error('Proxy error'))
        .mockResolvedValueOnce({})
      const proxyOk = 'proxyOk'
      const proxies = createProxiesUtilMock({
        getAllProxiesNames: jest.fn().mockResolvedValue(['proxyErr', proxyOk])
      })
      const deps = createMockDeps({ proxies })

      const headers = fixtures.partiesCallHeadersDto({ destination: '' })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      const sentList = await service.triggerInterSchemeDiscoveryFlow(headers)
      expect(sentList).toEqual([proxyOk])
      expect(deps.proxyCache.receivedErrorResponse).toHaveBeenCalledTimes(1)
      expect(participantMock.sendRequest.mock.lastCall[1]).toBe(proxyOk)
    })

    const throwDelayedErrorOnNthCall = (N, delay = 1000, error = new Error('Nth call Delayed Error')) => {
      let count = 0
      return async () => {
        count++
        if (count !== N) return {}
        await sleep(1000)
        throw error
      }
    }

    const prepareGetPartiesServiceForDelayedProxyError = () => {
      participantMock.sendRequest = jest.fn(throwDelayedErrorOnNthCall(2)) // throw error on 2nd proxy call
      const proxies = createProxiesUtilMock({
        getAllProxiesNames: jest.fn().mockResolvedValue(['proxy1', 'proxy2'])
      })
      const proxyCache = createProxyCacheMock({
        receivedErrorResponse: jest.fn().mockResolvedValue(true) // failed proxy request is last in inter-scheme discovery flow
      })
      const deps = createMockDeps({ proxies, proxyCache })
      const headers = fixtures.partiesCallHeadersDto({ destination: '' })
      const params = fixtures.partiesParamsDto()

      return new GetPartiesService(deps, { headers, params })
    }

    test('should throw an error if proxyRequest failed after delay, and other proxies have already replied', async () => {
      expect.assertions(1)
      const service = prepareGetPartiesServiceForDelayedProxyError()
      const { headers } = service.inputs

      await expect(service.triggerInterSchemeDiscoveryFlow(headers))
        .rejects.toThrow(ERROR_MESSAGES.noSuccessfulProxyDiscoveryResponses)
    })

    test('should send error callback in ISO format if proxyRequest failed after delay, and other proxies have already replied', async () => {
      const service = prepareGetPartiesServiceForDelayedProxyError()
      const { headers } = service.inputs
      service.deps.config.API_TYPE = API_TYPES.iso20022

      await service.triggerInterSchemeDiscoveryFlow(headers)
        .catch(err => service.handleError(err))
      expect(participantMock.sendErrorToParticipant).toHaveBeenCalledTimes(1)
      expect(participantMock.sendErrorToParticipant.mock.lastCall[2].Rpt.Rsn.Cd).toBe('3200')
    })
  })

  describe('setProxyGetPartiesTimeout Tests', () => {
    test('should set getParties timeout for local source and external destination', async () => {
      participantMock.validateParticipant = jest.fn()
        .mockResolvedValueOnce({}) // source
        .mockResolvedValueOnce(null) // destination
      const proxyId = 'proxy-destination'
      const proxyCache = createProxyCacheMock({
        lookupProxyByDfspId: jest.fn().mockResolvedValueOnce(proxyId)
      })
      const deps = createMockDeps({ proxyCache })
      const headers = fixtures.partiesCallHeadersDto()
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
      expect(proxyCache.setProxyGetPartiesTimeout).toHaveBeenCalledTimes(1)
      expect(proxyCache.setProxyGetPartiesTimeout.mock.lastCall[1]).toBe(proxyId)
      expect(participantMock.sendRequest).toHaveBeenCalledTimes(1)
    })

    test('should NOT set getParties timeout if source is external', async () => {
      participantMock.validateParticipant = jest.fn()
        .mockResolvedValueOnce(null) // source
        .mockResolvedValueOnce({}) // proxy-src
      const proxyCache = createProxyCacheMock({
        lookupProxyByDfspId: jest.fn().mockResolvedValue('proxy-desc')
      })
      const deps = createMockDeps({ proxyCache })
      const headers = fixtures.partiesCallHeadersDto({ proxy: 'proxy-src' })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
      expect(proxyCache.setProxyGetPartiesTimeout).not.toHaveBeenCalled()
      expect(participantMock.sendRequest).toHaveBeenCalledTimes(1)
    })

    test('should NOT set getParties timeout if destination is local', async () => {
      participantMock.validateParticipant = jest.fn().mockResolvedValue({})
      const proxyCache = createProxyCacheMock()
      const deps = createMockDeps({ proxyCache })
      const headers = fixtures.partiesCallHeadersDto()
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
      expect(proxyCache.setProxyGetPartiesTimeout).not.toHaveBeenCalled()
      expect(participantMock.sendRequest).toHaveBeenCalledTimes(1)
    })

    test('should set getParties timeout if oracle returns external participant', async () => {
      participantMock.validateParticipant = jest.fn()
        .mockResolvedValueOnce({}) // source
        .mockResolvedValueOnce(null) // externalDfsp
      oracleMock.oracleRequest = jest.fn(async () => fixtures.oracleRequestResponseDto({
        partyList: [{ fspId: 'externalDfsp' }]
      }))
      const proxyCache = createProxyCacheMock({
        lookupProxyByDfspId: jest.fn().mockResolvedValue('proxyExternal')
      })
      const deps = createMockDeps({ proxyCache })
      const headers = fixtures.partiesCallHeadersDto({ destination: '' })
      const params = fixtures.partiesParamsDto()
      const service = new GetPartiesService(deps, { headers, params })

      await service.handleRequest()
      expect(proxyCache.setProxyGetPartiesTimeout).toHaveBeenCalledTimes(1)
      expect(participantMock.sendRequest).toHaveBeenCalledTimes(1)
    })
  })

  test('should send partyNotFound callback in ISO20022 format', async () => {
    participantMock.validateParticipant = jest.fn().mockResolvedValue({})
    oracleMock.oracleRequest = jest.fn()
    const deps = {
      ...createMockDeps(),
      config: { ...config, API_TYPE: API_TYPES.iso20022 }
    }
    const headers = fixtures.partiesCallHeadersDto({ destination: '' })
    const params = fixtures.partiesParamsDto()
    const service = new GetPartiesService(deps, { headers, params })

    await service.handleRequest()
    expect(participantMock.sendErrorToParticipant).toHaveBeenCalledTimes(1)
    const isoPayload = participantMock.sendErrorToParticipant.mock.lastCall[2]
    expect(isoPayload.Assgnmt).toBeDefined()
    expect(isoPayload.Rpt).toBeDefined()
  })
})
