/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 --------------
 **********/

const mockSendRequest = jest.fn()

jest.mock('@mojaloop/central-services-shared', () => ({
  ...jest.requireActual('@mojaloop/central-services-shared'),
  Util: {
    ...jest.requireActual('@mojaloop/central-services-shared').Util,
    Endpoints: { getEndpoint: jest.fn() },
    Request: { sendRequest: mockSendRequest }
  }
}))

const { API_TYPES } = require('@mojaloop/central-services-shared').Util.Hapi
const { logger } = require('../../../../src/lib')
const utils = require('../../../../src/domain/parties/utils')
const config = require('../../../../src/lib/config')
const fixtures = require('../../../fixtures')

describe('parties utils Tests -->', () => {
  test('should send error party callback in ISO format', async () => {
    const isoConfig = { ...config, API_TYPE: API_TYPES.iso20022 }
    const err = new Error('test error')
    const source = 'dfsp1'
    const headers = fixtures.partiesCallHeadersDto({ source })
    const params = { ID: '1234', Type: 'MSISDN' }

    const handleError = utils.createErrorHandlerOnSendingCallback(isoConfig, logger)
    await handleError(err, headers, params, source)

    expect(mockSendRequest).toHaveBeenCalledTimes(1)
    const { payload } = mockSendRequest.mock.calls[0][0]
    expect(payload.Rpt.Rsn.Cd).toBe('2001')
    expect(payload.Rpt.OrgnlId).toBe(`${params.Type}/${params.ID}`)
    expect(payload.Assgnmt.Assgnr.Agt.FinInstnId.Othr.Id).toBe(source)
  })
})
