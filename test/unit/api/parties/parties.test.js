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
const Db = require('../../../../src/lib/db')
const Helper = require('../../../util/helper')
const participants = require('../../../../src/domain/participants')
const initServer = require('../../../../src/server').initializeApi
const getPort = require('get-port')
const Logger = require('@mojaloop/central-services-logger')
const Config = require('../../../../src/lib/config')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let server
let sandbox

describe('/parties', () => {
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

  it('postParticipantsBatch returns 200', async () => {
    // Arrange
    const mock = {
      requestId: 'f3c6a35e-dd36-4186-9363-ec5accf3338a',
      partyList: [{
        partyIdType: 'MSISDN',
        partyIdentifier: 'MIYCVaNdsLD',
        partySubIdOrType: 'GNYKQO',
        fspId: 'ohidNUSaZRGCUViMhXOwyiPKq'
      },
      {
        partyIdType: 'MSISDN',
        partyIdentifier: 'eEmRAczAyz',
        partySubIdOrType: 'ki',
        fspId: 'sYhkSmfUW'
      },
      {
        partyIdType: 'MSISDN',
        partyIdentifier: 'SNLwBJVZ',
        partySubIdOrType: 'fBcEvS',
        fspId: 'lgfJVXYOpsNfY'
      }
      ],
      currency: 'EUR'
    }

    const options = {
      method: 'post',
      url: '/participants',
      headers: Helper.defaultSwitchHeaders,
      payload: mock
    }

    sandbox.stub(participants, 'postParticipantsBatch').returns({})

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(200)
    participants.postParticipantsBatch.restore()
  })
})
