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
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 --------------
 **********/

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const partiesUtils = require('#src/domain/parties/partiesUtils')
const config = require('#src/lib/config')
const { API_TYPES } = require('#src/constants')
const fixtures = require('#test/fixtures/index')

describe('partiesUtils Tests -->', () => {
  describe('makePutPartiesErrorPayload Tests', () => {
    const error = ErrorHandler.Factory.reformatFSPIOPError(new Error('Test Error'))
    const ERR_CODE = '2001'
    const headers = fixtures.partiesCallHeadersDto()
    const params = fixtures.partiesParamsDto()

    test('should make putParties error payload in FSPIOP format', async () => {
      const fspiopConfig = { ...config, API_TYPE: API_TYPES.fspiop }
      const payload = await partiesUtils.makePutPartiesErrorPayload(fspiopConfig, error, headers, params)
      expect(payload.errorInformation.errorCode).toBe(ERR_CODE)
    })

    test('should make putParties error payload in ISO20022 format', async () => {
      const fspiopConfig = { ...config, API_TYPE: API_TYPES.iso20022 }
      const payload = await partiesUtils.makePutPartiesErrorPayload(fspiopConfig, error, headers, params)
      expect(payload.Rpt.Rsn.Cd).toBe(ERR_CODE)
    })
  })
})
