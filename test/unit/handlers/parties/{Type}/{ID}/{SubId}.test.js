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
const initServer = require('../../../../../../src/server').initializeApi
const Db = require('../../../../../../src/lib/db')
const oracleEndpoint = require('../../../../../../src/models/oracle')
const parties = require('../../../../../../src/domain/parties')
const participant = require('../../../../../../src/models/participantEndpoint/facade')
const Helper = require('../../../../../util/helper')

let server
let sandbox

describe('/parties/{Type}/{ID}/{SubId}', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    server = await initServer(await getPort())
  })

  afterAll(async () => {
    await server.stop()
    sandbox.restore()
  })

  it('getPartiesByTypeAndID (with SubId) success', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}/{SubId}', 'get')
    const options = {
      method: 'get',
      url: mock.request.path,
      headers: Helper.defaultStandardHeaders('parties')
    }
    sandbox.stub(parties, 'getPartiesByTypeAndID').returns({})

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(202)
    parties.getPartiesByTypeAndID.restore()
  })

  it('getPartiesByTypeAndID endpoint sends async 3204 to /error for invalid party ID on response with status 400', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}/{SubId}', 'get')

    const headers = Helper.defaultStandardHeaders('parties')
    delete headers['fspiop-destination']

    const options = {
      method: 'get',
      url: mock.request.path,
      headers
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

    // Act
    const response = await server.inject(options)

    // Assert
    const errorCallStub = stubs[0]
    expect(errorCallStub.args[0][2].errorInformation.errorCode).toBe('3204')
    expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR)
    expect(response.statusCode).toBe(202)
    stubs.forEach(s => s.restore())
  })

  // Added error 404 to cover a special case of the Mowali implementation
  // which uses mojaloop/als-oracle-pathfinder and currently returns 404.
  it('getPartiesByTypeAndID endpoint sends async 3201 to /error for invalid party ID with status 404', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}/{SubId}', 'get')

    const headers = Helper.defaultStandardHeaders('parties')
    delete headers['fspiop-destination']

    const options = {
      method: 'get',
      url: mock.request.path,
      headers: headers,
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

    // Act
    const response = await server.inject(options)

    // Assert
    const errorCallStub = stubs[0]
    expect(errorCallStub.args[0][2].errorInformation.errorCode).toBe('3201')
    expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR)
    expect(response.statusCode).toBe(202)
    stubs.forEach(s => s.restore())
  })

  it('putPartiesByTypeAndID endpoint', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}/{SubId}', 'put')
    const options = {
      method: 'put',
      url: mock.request.path,
      headers: Helper.defaultStandardHeaders('parties'),
      payload: mock.request.body
    }
    options.payload.party.personalInfo.complexName.firstName = 'Justin'
    options.payload.party.personalInfo.complexName.middleName = 'middle'
    options.payload.party.personalInfo.complexName.lastName = 'résumé'
    sandbox.stub(parties, 'putPartiesByTypeAndID').returns({})

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(200)
  })
})
