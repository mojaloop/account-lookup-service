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
const BasePartiesService = require('#src/domain/parties/services/BasePartiesService')
const config = require('#src/lib/config')
const { API_TYPES } = require('#src/constants')
const fixtures = require('#test/fixtures/index')

describe('BasePartiesService Tests -->', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send error party callback in ISO20022 format', async () => {
    participantMock.validateParticipant = jest.fn().mockResolvedValue({})
    const deps = {
      ...createMockDeps(),
      config: { ...config, API_TYPE: API_TYPES.iso20022 }
    }
    const source = 'sourceFsp'
    const headers = fixtures.partiesCallHeadersDto({ source })
    const params = fixtures.partiesParamsDto()
    const service = new BasePartiesService(deps, { headers, params })

    await service.handleError(new Error('test error'))
    expect(participantMock.sendErrorToParticipant).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line no-unused-vars
    const [sentTo, _, payload] = participantMock.sendErrorToParticipant.mock.lastCall
    expect(sentTo).toBe(source)
    expect(payload.Rpt.Rsn.Cd).toBe('2001')
    expect(payload.Rpt.OrgnlId).toBeDefined()
    expect(payload.Assgnmt.Assgne.Agt.FinInstnId.Othr.Id).toBe(source)
    expect(payload.Assgnmt.Assgnr.Agt.FinInstnId.Othr.Id).toBe(config.HUB_NAME)
  })

  test('should remove proxy getParties timeout cache key', async () => {
    const deps = createMockDeps()
    const proxy = 'proxyAB'
    const headers = fixtures.partiesCallHeadersDto({ proxy })
    const params = fixtures.partiesParamsDto()
    const alsReq = {}
    const service = new BasePartiesService(deps, { headers, params })

    await service.removeProxyGetPartiesTimeoutCache(alsReq)
    expect(deps.proxyCache.removeProxyGetPartiesTimeout).toHaveBeenCalledWith(alsReq, proxy)
  })
})
