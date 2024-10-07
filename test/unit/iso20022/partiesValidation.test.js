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

const { setTimeout: sleep } = require('node:timers/promises')
const Sinon = require('sinon')
const getPort = require('get-port')
const { API_TYPES } = require('@mojaloop/central-services-shared').Util.Hapi

const { initializeApi } = require('../../../src/server')
const participant = require('../../../src/models/participantEndpoint/facade')
const config = require('../../../src/lib/config')
const db = require('../../../src/lib/db')

const { partiesHeadersDto } = require('../../util/helper')
const { isoPartiesPutPayloadDto } = require('../../fixtures')

describe('ISO20022 PUT /parties endpoints validation Tests -->', () => {
  let server
  let sandbox

  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(db, 'connect').resolves({})
    config.API_PORT = await getPort()
    config.API_TYPE = API_TYPES.iso20022
    server = await initializeApi(config)
  })

  beforeEach(() => {
    sandbox.stub(participant)
  })

  afterEach(() => {
    sandbox.restore()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('should return 400 if fspiop headers were sent in case of API_TYPE=iso20022', async () => {
    const headers = partiesHeadersDto({ apiType: API_TYPES.fspiop })
    const request = {
      method: 'PUT',
      url: '/parties/MSISDN/123456789',
      headers,
      payload: {}
    }
    const { statusCode, result } = await server.inject(request)

    expect(statusCode).toBe(400)
    expect(result.errorInformation.errorDescription).toBe('Malformed syntax - Invalid accept header')
  })

  test('should pass headers validation, and fail due to incorrect payload', async () => {
    const headers = partiesHeadersDto({ apiType: API_TYPES.iso20022 })
    const request = {
      method: 'PUT',
      url: '/parties/MSISDN/123456789',
      headers,
      payload: {}
    }
    const { statusCode, result } = await server.inject(request)

    expect(statusCode).toBe(400)
    expect(result.errorInformation.errorDescription).toBe("Missing mandatory element - /requestBody must have required property 'Assgnmt'")
  })

  test('should return 200 from PUT /parties/{Type}/{ID} with proper ISO payload', async () => {
    const headers = partiesHeadersDto({ apiType: API_TYPES.iso20022 })
    const payload = isoPartiesPutPayloadDto()
    const request = {
      method: 'PUT',
      url: '/parties/MSISDN/123456789',
      headers,
      payload
    }
    const response = await server.inject(request)
    expect(response.statusCode).toBe(200)
  })

  test('should forward PUT /parties/{Type}/{ID} callback payload (ISO format)', async () => {
    const headers = partiesHeadersDto({ apiType: API_TYPES.iso20022 })
    const payload = isoPartiesPutPayloadDto()
    const request = {
      method: 'PUT',
      url: '/parties/MSISDN/123456789',
      headers,
      payload
    }
    participant.validateParticipant = sandbox.stub().resolves({})

    const { statusCode } = await server.inject(request)
    expect(statusCode).toBe(200)
    await sleep(1000)

    expect(participant.validateParticipant.callCount).toBe(2)
    expect(participant.sendRequest.callCount).toBe(1)

    const { args } = participant.sendRequest.getCalls()[0]
    const contentType = args[0]['content-type']
    expect(contentType).toContain('iso20022')

    const sentPayload = JSON.parse(args[4])
    expect(sentPayload).toEqual(payload)
  })
})
