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

const { PutPartiesErrorService } = require('#src/domain/parties/services/index')
const oracle = require('#src/models/oracle/facade')
const fixtures = require('#test/fixtures/index')
const { createMockDeps } = require('./deps')

const { RestMethods } = PutPartiesErrorService.enums()

describe('PutPartiesErrorService Tests -->', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should cleanup oracle and trigger discovery flow for party from external dfsp', async () => {
    const headers = fixtures.partiesCallHeadersDto({ proxy: 'proxyA' })
    const params = fixtures.partiesParamsDto()
    const service = new PutPartiesErrorService(createMockDeps(), { headers, params })

    const needDiscovery = await service.handleRequest()
    expect(needDiscovery).toBe(true)
    expect(oracle.oracleRequest.mock.calls.length).toBe(1)
    expect(oracle.oracleRequest.mock.lastCall[1]).toBe(RestMethods.DELETE)
  })
})
