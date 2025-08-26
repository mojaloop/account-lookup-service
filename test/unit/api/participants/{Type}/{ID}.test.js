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
  - Steven Oderayi <steven.oderayi@modusbox.com>

  * Crosslake
  - Lewis Daly <lewisd@crosslaketech.com>

  --------------
  ******/

'use strict'

const Sinon = require('sinon')
const getPort = require('get-port')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const requestUtil = require('@mojaloop/central-services-shared').Util.Request
const Enums = require('@mojaloop/central-services-shared').Enum
const Db = require('../../../../../src/lib/db')
const oracleEndpointCached = require('../../../../../src/models/oracle/oracleEndpointCached')
const participant = require('../../../../../src/models/participantEndpoint/facade')
const participants = require('../../../../../src/domain/participants')
const Helper = require('../../../../util/helper')
const initServer = require('../../../../../src/server').initializeApi
const Config = require('../../../../../src/lib/config')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let server
let sandbox

// Helper function to test missing parameter scenarios
const testMissingParameter = (method, urlWithMissingParam, payloadRequired = false) => {
  return async () => {
    const options = {
      method,
      url: urlWithMissingParam,
      headers: Helper.defaultSwitchHeaders
    }

    if (payloadRequired) {
      const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}', method)
      options.payload = mock.request.body
    }

    const response = await server.inject(options)

    expect(response.statusCode).toBe(404)
    expect(response.result.errorInformation).toBeDefined()
    expect(response.result.errorInformation.errorCode).toBe('3002')
    expect(response.result.errorInformation.errorDescription).toContain('Unknown URI')
  }
}

// Helper function to test successful domain method calls
const testSuccessfulDomainCall = (method, domainMethod, expectedStatus, pathOverride = null) => {
  return async () => {
    const path = pathOverride || '/participants/{Type}/{ID}'
    const mock = await Helper.generateMockRequest(path, method)
    const options = {
      method,
      url: mock.request.path,
      headers: Helper.defaultSwitchHeaders,
      payload: mock.request.body
    }
    sandbox.stub(participants, domainMethod).resolves({})

    const response = await server.inject(options)

    expect(response.statusCode).toBe(expectedStatus)
    expect(participants[domainMethod].callCount).toBe(1)
    expect(participants[domainMethod].getCall(0).returnValue).resolves.toStrictEqual({})

    participants[domainMethod].restore()
  }
}

// Helper function to test domain method error handling
const testDomainMethodError = (method, domainMethod, expectedStatus, pathOverride = null) => {
  return async () => {
    const path = pathOverride || '/participants/{Type}/{ID}'
    const mock = await Helper.generateMockRequest(path, method)
    const options = {
      method,
      url: mock.request.path,
      headers: Helper.defaultSwitchHeaders,
      payload: mock.request.body
    }
    const throwError = new Error('Unknown error')
    sandbox.stub(participants, domainMethod).rejects(throwError)

    const response = await server.inject(options)

    expect(response.statusCode).toBe(expectedStatus)
    expect(participants[domainMethod].callCount).toBe(1)
    expect(participants[domainMethod].getCall(0).returnValue).rejects.toStrictEqual(throwError)

    participants[domainMethod].restore()
  }
}

describe('/participants/{Type}/{ID}', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    Config.API_PORT = await getPort()
    server = await initServer(Config)
    sandbox.stub(Logger)
    Logger.error = sandbox.stub()
  })

  afterAll(async () => {
    await server.stop()
    sandbox.restore()
  })

  describe('GET /participants', () => {
    it('returns 404 when ID parameter is missing', testMissingParameter('get', '/participants/MSISDN/'))
    it('returns 404 when Type parameter is missing', testMissingParameter('get', '/participants//123456789'))

    it('returns 202 when getParticipantsByTypeAndID resolves', testSuccessfulDomainCall('get', 'getParticipantsByTypeAndID', 202))

    it('getParticipantsByTypeAndID sends an async 3204 for invalid party id on response with status 400', async () => {
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
        sandbox.stub(participant, 'sendErrorToParticipant').resolves({}),
        sandbox.stub(participant, 'validateParticipant').resolves(true),
        sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').resolves(['whatever']),
        sandbox.stub(requestUtil, 'sendRequest').rejects(badRequestError)
      ]
      const response = await server.inject(options)
      const errorCallStub = stubs[0]

      // Assert
      expect(errorCallStub.args[0][2].errorInformation.errorCode).toBe('3204')
      expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR)
      expect(response.statusCode).toBe(202)

      // Cleanup
      stubs.forEach(s => s.restore())
    })

    // Added error 404 to cover a special case of the Mowali implementation
    // which uses mojaloop/als-oracle-pathfinder and currently returns 404.
    it('getParticipantsByTypeAndID sends an async 3201 for invalid party id on response with status 404', async () => {
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
        [{ key: 'status', value: 404 }]
      )
      const stubs = [
        sandbox.stub(participant, 'sendErrorToParticipant').resolves({}),
        sandbox.stub(participant, 'validateParticipant').resolves(true),
        sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').resolves(['whatever']),
        sandbox.stub(requestUtil, 'sendRequest').rejects(badRequestError)
      ]
      const response = await server.inject(options)
      const errorCallStub = stubs[0]

      // Assert
      expect(errorCallStub.args[0][2].errorInformation.errorCode).toBe('3201')
      expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR)
      expect(response.statusCode).toBe(202)

      // Cleanup
      stubs.forEach(s => s.restore())
    })

    it('returns 202 when getParticipantsByTypeAndID rejects with an unknown error', testDomainMethodError('get', 'getParticipantsByTypeAndID', 202))
  })

  describe('POST /participants', () => {
    it('returns 404 when ID parameter is missing', testMissingParameter('post', '/participants/MSISDN/', true))

    it('returns 202 when postParticipants resolves', testSuccessfulDomainCall('post', 'postParticipants', 202))

    it('returns 202 when postParticipants rejects with an unknown error', testDomainMethodError('post', 'postParticipants', 202))
  })

  describe('PUT /participants', () => {
    it('returns 404 when ID parameter is missing', testMissingParameter('put', '/participants/MSISDN/', true))

    it('returns 200 when putParticipantsByTypeAndID resolves', testSuccessfulDomainCall('put', 'putParticipantsByTypeAndID', 200))

    it('returns 200 when putParticipantsByTypeAndID rejects with an unknown error', testDomainMethodError('put', 'putParticipantsByTypeAndID', 200))
  })

  describe('DELETE /participants', () => {
    it('returns 404 when ID parameter is missing', testMissingParameter('delete', '/participants/MSISDN/', true))

    it('returns 202 when deleteParticipants resolves', testSuccessfulDomainCall('delete', 'deleteParticipants', 202))

    it('returns 202 when deleteParticipants rejects with an unknown error', testDomainMethodError('delete', 'deleteParticipants', 202))
  })

  describe('PUT /error', () => {
    it('returns 200 when putParticipantsErrorByTypeAndID resolves', testSuccessfulDomainCall('put', 'putParticipantsErrorByTypeAndID', 200, '/participants/{Type}/{ID}/error'))

    it('returns 200 when putParticipantsErrorByTypeAndID rejects with an unknown error', testDomainMethodError('put', 'putParticipantsErrorByTypeAndID', 200, '/participants/{Type}/{ID}/error'))
  })
})
