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

const { PutPartiesErrorService } = require('#src/domain/parties/services/index')
const { createMockDeps, createOracleFacadeMock, createParticipantFacadeMock } = require('./deps')
const fixtures = require('#test/fixtures/index')

const { RestMethods, Headers } = PutPartiesErrorService.enums()

describe('PutPartiesErrorService Tests -->', () => {
  let oracle
  let participant

  beforeEach(() => {
    jest.clearAllMocks()
    oracle = createOracleFacadeMock()
    participant = createParticipantFacadeMock()
  })

  test('should cleanup oracle and forward PARTY_RESOLUTION_FAILURE error for party from external dfsp', async () => {
    participant.validateParticipant = jest.fn().mockRejectedValue(new Error('No participant found')) // external participant
    oracle.oracleRequest = jest.fn().mockResolvedValue({
      data: { partyList: [{ fspId: 'fspId' }] }
    })
    const destination = 'externalDestination'
    const proxyDest = 'proxyDest'
    const deps = createMockDeps({ oracle, participant })
    deps.proxyCache.lookupProxyByDfspId = jest.fn().mockResolvedValue(proxyDest)

    const headers = fixtures.partiesCallHeadersDto({ destination, proxy: 'proxyA' })
    const params = fixtures.partiesParamsDto()
    const data = { test: true }
    const dataUri = fixtures.dataUriDto(data)

    const service = new PutPartiesErrorService(deps, { headers, params, dataUri })
    await service.handleRequest()

    expect(oracle.oracleRequest).toHaveBeenCalledTimes(2)
    expect(oracle.oracleRequest.mock.lastCall[1]).toBe(RestMethods.DELETE)
    expect(participant.sendErrorToParticipant).toHaveBeenCalledTimes(1)

    const [sentTo, , payload, cbHeaders] = participant.sendErrorToParticipant.mock.lastCall
    expect(sentTo).toBe(proxyDest)
    expect(cbHeaders[Headers.FSPIOP.DESTINATION]).toBe(destination)
    expect(payload).toBe(JSON.stringify(data))
  })

  test('should NOT cleanup oracle if destination is local', async () => {
    const destination = 'localDfsp'
    participant.validateParticipant = jest.fn().mockResolvedValue({})
    const deps = createMockDeps({ participant })

    const headers = fixtures.partiesCallHeadersDto({ destination })
    const params = fixtures.partiesParamsDto()
    const dataUri = fixtures.dataUriDto()
    const service = new PutPartiesErrorService(deps, { headers, params, dataUri })

    await service.handleRequest()
    expect(oracle.oracleRequest).not.toHaveBeenCalled()
    expect(participant.sendErrorToParticipant).toHaveBeenCalledTimes(1)
    expect(participant.sendErrorToParticipant.mock.lastCall[0]).toBe(destination)
  })
})
