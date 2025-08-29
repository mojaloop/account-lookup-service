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

const { createMockDeps, participantMock } = require('./deps')
// ↑ should be first require to mock external deps ↑
const { PutPartiesService } = require('#src/domain/parties/services/index')
const config = require('#src/lib/config')
const fixtures = require('#test/fixtures/index')

const { Headers } = PutPartiesService.enums()

describe('PutPartiesService Tests -->', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send error callback to source in case of error on forwarding request to destination (buffer scheme)', async () => {
    const errMessage = 'Test Http Error'
    participantMock.sendRequest = jest.fn().mockRejectedValue(new Error(errMessage))
    participantMock.validateParticipant = jest.fn().mockResolvedValue({})
    const source = 'mwk-dfsp'
    const destination = 'zmk-dfsp'
    const headers = fixtures.partiesCallHeadersDto({ source, destination, proxy: '' })
    const params = fixtures.partiesParamsDto()
    const dataUri = fixtures.dataUriDto()
    const service = new PutPartiesService(createMockDeps(), { headers, params, dataUri })

    await service.handleRequest()
      .catch(err => service.handleError(err))

    expect(participantMock.sendErrorToParticipant).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line no-unused-vars
    const [sentTo, _, payload, cbHeaders] = participantMock.sendErrorToParticipant.mock.lastCall
    expect(sentTo).toBe(source)
    expect(payload.errorInformation.errorCode).toBe('2001')
    expect(payload.errorInformation.errorDescription.endsWith(errMessage)).toBe(true)
    expect(cbHeaders[Headers.FSPIOP.SOURCE]).toBe(config.HUB_NAME)
    expect(cbHeaders[Headers.FSPIOP.DESTINATION]).toBe(source)
  })

  test('should send error callback to source proxy in case of error on forwarding request to destination proxy (region scheme)', async () => {
    const errMessage = 'Test Http Error'
    participantMock.sendRequest = jest.fn().mockRejectedValue(new Error(errMessage))
    participantMock.validateParticipant = jest.fn().mockResolvedValue(null)

    const source = 'zmk-dfsp'
    const proxy = 'proxy-zmk'
    const destination = 'mwk-dfsp'
    const proxyDest = 'proxy-mwk'

    const deps = createMockDeps()
    deps.proxyCache.lookupProxyByDfspId = jest.fn(async (dfsp) => {
      if (dfsp === source) return proxy
      if (dfsp === destination) return proxyDest
      return null
    })

    const headers = fixtures.partiesCallHeadersDto({ source, destination, proxy })
    const params = fixtures.partiesParamsDto()
    const dataUri = fixtures.dataUriDto()
    const service = new PutPartiesService(deps, { headers, params, dataUri })

    await service.handleRequest()
      .catch(err => service.handleError(err))

    expect(participantMock.sendErrorToParticipant).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line no-unused-vars
    const [sentTo, _, payload, cbHeaders] = participantMock.sendErrorToParticipant.mock.lastCall
    expect(sentTo).toBe(proxy)
    expect(payload.errorInformation.errorCode).toBe('2001')
    expect(payload.errorInformation.errorDescription.endsWith(errMessage)).toBe(true)
    expect(cbHeaders[Headers.FSPIOP.SOURCE]).toBe(config.HUB_NAME)
    expect(cbHeaders[Headers.FSPIOP.DESTINATION]).toBe(source)
  })

  test('should just log error in case handleError failed', async () => {
    const headers = fixtures.partiesCallHeadersDto()
    const params = fixtures.partiesParamsDto()
    const dataUri = fixtures.dataUriDto()
    const service = new PutPartiesService(createMockDeps(), { headers, params, dataUri })

    service.handleRequest = jest.fn().mockRejectedValue(new Error('handleRequest failed'))
    service.identifyDestinationForCallback = jest.fn()
    service.sendErrorCallback = jest.fn().mockRejectedValue(new Error('sendErrorCallback failed'))
    const logSpy = jest.spyOn(service.log.mlLogger, 'error')

    const result = await service.handleRequest()
      .catch(err => service.handleError(err))

    expect(result).toBeUndefined()
    expect(logSpy.mock.lastCall[0]).toBe('failed to handleError. No further processing! ')
  })
})
