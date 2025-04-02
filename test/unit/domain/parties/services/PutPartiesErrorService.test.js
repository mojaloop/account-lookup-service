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

const { createMockDeps, oracleMock, participantMock } = require('./deps')
// ↑ should be first require to mock external deps ↑
const { PutPartiesErrorService } = require('#src/domain/parties/services/index')
const fixtures = require('#test/fixtures/index')
const { ERROR_MESSAGES } = require('#src/constants')

const { RestMethods } = PutPartiesErrorService.enums()

describe('PutPartiesErrorService Tests -->', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should cleanup oracle and throw SERVICE_CURRENTLY_UNAVAILABLE error for party from external dfsp', async () => {
    expect.hasAssertions()
    participantMock.validateParticipant = jest.fn().mockResolvedValue({})
    const headers = fixtures.partiesCallHeadersDto({ proxy: 'proxyA' })
    const params = fixtures.partiesParamsDto()
    const dataUri = fixtures.dataUriDto()
    const service = new PutPartiesErrorService(createMockDeps(), { headers, params, dataUri })

    await service.handleRequest()
      .catch(err => {
        expect(err).toEqual(service.createFspiopServiceUnavailableError(ERROR_MESSAGES.externalPartyError))
        expect(oracleMock.oracleRequest).toHaveBeenCalledTimes(1)
        expect(oracleMock.oracleRequest.mock.lastCall[1]).toBe(RestMethods.DELETE)
        expect(participantMock.sendErrorToParticipant).not.toHaveBeenCalled()
      })
  })

  test('should NOT cleanup oracle if destination is external', async () => {
    const destination = 'externalDfsp'
    const proxyDest = 'proxyDest'
    const deps = createMockDeps()
    deps.participant.validateParticipant = jest.fn().mockResolvedValue(null)
    deps.proxyCache.lookupProxyByDfspId = jest.fn().mockResolvedValue(proxyDest)

    const headers = fixtures.partiesCallHeadersDto({
      destination, proxy: 'proxyA'
    })
    const params = fixtures.partiesParamsDto()
    const dataUri = fixtures.dataUriDto()
    const service = new PutPartiesErrorService(deps, { headers, params, dataUri })

    await service.handleRequest()
    expect(oracleMock.oracleRequest).not.toHaveBeenCalled()
    expect(participantMock.sendErrorToParticipant).toHaveBeenCalledTimes(1)
    expect(participantMock.sendErrorToParticipant.mock.lastCall[0]).toBe(proxyDest)
  })
})
