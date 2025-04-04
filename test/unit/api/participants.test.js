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

 * ModusBox
 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const getPort = require('get-port')
const Logger = require('@mojaloop/central-services-logger')
const initServer = require('../../../src/server').initializeApi
const Helper = require('../../util/helper')
const Db = require('../../../src/lib/db')
const Config = require('../../../src/lib/config')
const fixtures = require('../../fixtures')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let sandbox
let server

describe('/participants', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    Config.API_PORT = await getPort()
    server = await initServer(Config)
  })

  afterAll(async () => {
    await server.stop()
    sandbox.restore()
  })

  /**
   * summary: Participants
   * description: The HTTP request POST /participants is used to create information in the server regarding the provided list of identities. This request should be used for bulk creation of FSP information for more than one Party. The optional currency parameter should indicate that each provided Party supports the currency
   * parameters: body, Accept, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */

  it('POST /participants', async () => {
    // Arrange
    const mock = {
      requestId: 'HNNnJ',
      partyList: [{
        partyIdType: 'LnlWooyQk',
        partyIdentifier: 'MIYCVaNdsLD',
        partySubIdOrType: 'GNYKQO',
        fspId: 'ohidNUSaZRGCUViMhXOwyiPKq'
      },
      {
        partyIdType: 'QGijB',
        partyIdentifier: 'eEmRAczAyz',
        partySubIdOrType: 'ki',
        fspId: 'sYhkSmfUW'
      },
      {
        partyIdType: 'nxRgD',
        partyIdentifier: 'SNLwBJVZ',
        partySubIdOrType: 'fBcEvS',
        fspId: 'lgfJVXYOpsNfY'
      }
      ],
      currency: 'EUR'
    }
    // Get the resolved path from mock request
    // Mock request Path templates({}) are resolved using path parameters
    const options = {
      method: 'post',
      url: '/participants',
      headers: Helper.defaultAdminHeaders(),
      payload: mock
    }

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(400)
  })

  it('should validate requestId in UUID format', async () => {
    const reqOptions = {
      method: 'post',
      url: '/participants',
      headers: fixtures.participantsCallHeadersDto(),
      payload: fixtures.postParticipantsPayloadDto()
    }
    const response = await server.inject(reqOptions)
    expect(response.statusCode).toBe(200)
  })

  it('should validate requestId in ULID format', async () => {
    const reqOptions = {
      method: 'post',
      url: '/participants',
      headers: fixtures.participantsCallHeadersDto(),
      payload: fixtures.postParticipantsPayloadDto({ requestId: '01JE8SG3F4WNHY8B9876THQ344' })
    }
    const response = await server.inject(reqOptions)
    expect(response.statusCode).toBe(200)
  })

  it('should fail requestId validation', async () => {
    const reqOptions = {
      method: 'post',
      url: '/participants',
      headers: fixtures.participantsCallHeadersDto(),
      payload: fixtures.postParticipantsPayloadDto({ requestId: 'wrong format' })
    }
    const response = await server.inject(reqOptions)
    expect(response.statusCode).toBe(400)
  })
})
