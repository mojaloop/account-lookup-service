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

  * ModusBox
  - Rajiv Mothilal <rajiv.mothilal@modusbox.com>

  * Crosslake
  - Lewis Daly <lewisd@crosslaketech.com>

  --------------
  ******/

'use strict'

const Sinon = require('sinon')
const Db = require('../../../../../src/lib/db')
const oracleEndpoint = require('../../../../../src/models/oracle')
const participant = require('../../../../../src/models/participantEndpoint/facade')
const participants = require('../../../../../src/domain/participants')
const requestLogger = require('../../../../../src/lib/requestLogger')
const Helper = require('../../../../util/helper')
const initServer = require('../../../../../src/server').initialize
const getPort = require('get-port')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const requestUtil = require('@mojaloop/central-services-shared').Util.Request
const Enums = require('@mojaloop/central-services-shared').Enum

let server
let sandbox

describe('/participants/{Type}/{ID}', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    sandbox.stub(requestLogger, 'logRequest').returns({})
    sandbox.stub(requestLogger, 'logResponse').returns({})
    server = await initServer(await getPort())
  })

  afterAll(async () => {
    await server.stop()
    sandbox.restore()
  })

  describe('GET /participants', () => {
    it('getParticipantsByTypeAndID returns 202', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}', 'get')
      const options = {
        method: 'get',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders
      }
      sandbox.stub(participants, 'getParticipantsByTypeAndID').returns({})

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(202)
      participants.getParticipantsByTypeAndID.restore()
    })

    it('getParticipantsByTypeAndID sends an async 3200 for invalid party id', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}', 'get')
      const options = {
        method: 'get',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders
      }

      const badRequestError = ErrorHandler.Factory.createFSPIOPError(
        ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_COMMUNICATION_ERROR,
        'Failed to send HTTP request to host',
        {},
        {},
        [{ key: 'status', value: 400 }]
      )
      const stubs = [
        sandbox.stub(participant, 'sendErrorToParticipant').returns({}),
        sandbox.stub(participant, 'validateParticipant').returns(true),
        sandbox.stub(oracleEndpoint, 'getOracleEndpointByType').returns(['whatever']),
        sandbox.stub(requestUtil, 'sendRequest').throws(badRequestError)
      ]
      const response = await server.inject(options)
      const errorCallStub = stubs[0]

      // Assert
      expect(errorCallStub.args[0][2].errorInformation.errorCode).toBe('3204')
      expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR)
      expect(response.statusCode).toBe(202)
      stubs.forEach(s => s.restore())
    })

    it('handles error when getParticipantsByTypeAndID fails', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}', 'get')
      const options = {
        method: 'get',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders
      }
      sandbox.stub(participants, 'getParticipantsByTypeAndID').throws(new Error('Unknown error'))

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(500)
      participants.getParticipantsByTypeAndID.restore()
    })
  })

  describe('POST /participants', () => {
    it('postParticipants returns 202', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}', 'post')
      const options = {
        method: 'post',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }
      sandbox.stub(participants, 'postParticipants').returns({})

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(202)
      participants.postParticipants.restore()
    })

    it('postParticipants returns 500 on unknown error', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}', 'post')
      const options = {
        method: 'post',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }
      sandbox.stub(participants, 'postParticipants').throws(new Error('Unknown Error'))

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(500)
      participants.postParticipants.restore()
    })
  })

  describe('PUT /participants', () => {
    it('throws NOT_IMPLEMENTED error', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}', 'put')
      const options = {
        method: 'put',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(501)
    })
  })
})
