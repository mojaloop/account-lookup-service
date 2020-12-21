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
 - Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const getPort = require('get-port')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const requestUtil = require('@mojaloop/central-services-shared').Util.Request
const Enums = require('@mojaloop/central-services-shared').Enum
const Db = require('../../../../../../src/lib/db')
const oracleEndpoint = require('../../../../../../src/models/oracle')
const participant = require('../../../../../../src/models/participantEndpoint/facade')
const participants = require('../../../../../../src/domain/participants')
const requestLogger = require('../../../../../../src/lib/requestLogger')
const Helper = require('../../../../../util/helper')
const initServer = require('../../../../../../src/server').initializeApi

let server
let sandbox

describe('/participants/{Type}/{ID}/{SubId}', () => {
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
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'get')
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

    it('getParticipantsByTypeAndID sends an async 3204 for invalid party id on response with status 400', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'get')
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
      expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR)
      expect(response.statusCode).toBe(202)
      stubs.forEach(s => s.restore())
    })

    // Added error 404 to cover a special case of the Mowali implementation
    // which uses mojaloop/als-oracle-pathfinder and currently returns 404.
    it('getParticipantsByTypeAndID sends an async 3201 for invalid party id on response with status 404', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'get')
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
        [{ key: 'status', value: 404 }]
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
      expect(errorCallStub.args[0][2].errorInformation.errorCode).toBe('3201')
      expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR)
      expect(response.statusCode).toBe(202)
      stubs.forEach(s => s.restore())
    })

    it('handles error when getParticipantsByTypeAndID fails', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'get')
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
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'post')
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
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'post')
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
    it('putParticipantsByTypeAndID returns 200', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'put')
      const options = {
        method: 'put',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }
      sandbox.stub(participants, 'putParticipantsByTypeAndID').returns({})

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(200)
      participants.putParticipantsByTypeAndID.restore()
    })

    it('putParticipantsByTypeAndID returns 500 on unknown error', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'put')
      const options = {
        method: 'put',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }
      sandbox.stub(participants, 'putParticipantsByTypeAndID').throws(new Error('Unknown Error'))

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(500)
      participants.putParticipantsByTypeAndID.restore()
    })
  })

  describe('PUT /error', () => {
    it('putParticipantsErrorByTypeAndID returns 200', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}/error', 'put')
      const options = {
        method: 'put',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }
      sandbox.stub(participants, 'putParticipantsErrorByTypeAndID').returns({})

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(200)
      participants.putParticipantsErrorByTypeAndID.restore()
    })

    it('putParticipantsErrorByTypeAndID returns 500 on unknown error', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}/error', 'put')
      const options = {
        method: 'put',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }
      sandbox.stub(participants, 'putParticipantsErrorByTypeAndID').throws(new Error('Unknown Error'))

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(500)
      participants.putParticipantsErrorByTypeAndID.restore()
    })
  })

  describe('DELETE /participants', () => {
    it('deleteParticipants returns 202', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'delete')
      const options = {
        method: 'delete',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }
      sandbox.stub(participants, 'deleteParticipants').returns({})

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(202)
      participants.deleteParticipants.restore()
    })

    it('deleteParticipants returns 500 on unknown error', async () => {
      // Arrange
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}', 'delete')
      const options = {
        method: 'delete',
        url: mock.request.path,
        headers: Helper.defaultSwitchHeaders,
        payload: mock.request.body
      }
      sandbox.stub(participants, 'deleteParticipants').throws(new Error('Unknown Error'))

      // Act
      const response = await server.inject(options)

      // Assert
      expect(response.statusCode).toBe(500)
      participants.deleteParticipants.restore()
    })
  })
})
