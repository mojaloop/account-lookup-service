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

const { createMockDeps, createProxyCacheMock, participantMock } = require('./deps')
// ↑ should be first require to mock external deps ↑
const { TimeoutPartiesService } = require('#src/domain/parties/services/index')
const { API_TYPES } = require('#src/constants')
const fixtures = require('#test/fixtures/index')

describe('TimeoutPartiesService Tests -->', () => {
  const { config } = createMockDeps()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send error callback to external participant through proxy', async () => {
    participantMock.validateParticipant = jest.fn().mockResolvedValue(null)
    const proxy = 'proxyAB'
    const proxyCache = createProxyCacheMock({
      lookupProxyByDfspId: jest.fn().mockResolvedValue(proxy)
    })
    const deps = createMockDeps({ proxyCache })
    const cacheKey = fixtures.expiredCacheKeyDto()
    const service = TimeoutPartiesService.createInstance(deps, cacheKey, 'test')

    await service.handleExpiredKey()
    expect(participantMock.sendErrorToParticipant).toHaveBeenCalledTimes(1)
    expect(participantMock.sendErrorToParticipant.mock.lastCall[0]).toBe(proxy)
  })

  test('should send error callback in ISO20022 format', async () => {
    participantMock.validateParticipant = jest.fn().mockResolvedValue({})
    const deps = {
      ...createMockDeps(),
      config: { ...config, API_TYPE: API_TYPES.iso20022 }
    }
    const sourceId = 'sourceFsp'
    const cacheKey = fixtures.expiredCacheKeyDto({ sourceId })
    const service = TimeoutPartiesService.createInstance(deps, cacheKey, 'test')

    await service.handleExpiredKey()
    expect(participantMock.sendErrorToParticipant).toHaveBeenCalledTimes(1)
    const { Assgnr, Assgne } = participantMock.sendErrorToParticipant.mock.lastCall[2].Assgnmt
    expect(Assgnr.Agt.FinInstnId.Othr.Id).toBe(config.HUB_NAME)
    expect(Assgne.Agt.FinInstnId.Othr.Id).toBe(sourceId)
  })
})
