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
const initServer = require('../../../../../src/server').initializeApi
const Db = require('../../../../../src/lib/db')
const parties = require('../../../../../src/domain/parties')
const participant = require('../../../../../src/models/participantEndpoint/facade')
const getPort = require('get-port')
const Helper = require('../../../../util/helper')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const requestUtil = require('@mojaloop/central-services-shared').Util.Request
const Enums = require('@mojaloop/central-services-shared').Enum
const oracleEndpointCached = require('../../../../../src/models/oracle/oracleEndpointCached')

let server
let sandbox

describe('/parties', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    server = await initServer(await getPort())
  })

  afterEach(async () => {
    sandbox.restore()
  })

  afterAll(async () => {
    await server.stop()
    sandbox.restore()
  })

  it('getPartiesByTypeAndID success', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}', 'get')
    const options = {
      method: 'get',
      url: mock.request.path,
      headers: Helper.defaultStandardHeaders('parties')
    }
    sandbox.stub(parties, 'getPartiesByTypeAndID').resolves({})

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(202)
    expect(parties.getPartiesByTypeAndID.callCount).toBe(1)
    expect(parties.getPartiesByTypeAndID.getCall(0).returnValue).resolves.toStrictEqual({})

    // Cleanup
    parties.getPartiesByTypeAndID.restore()
  })

  it('getPartiesByTypeAndID failure', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}', 'get')
    const options = {
      method: 'get',
      url: mock.request.path,
      headers: Helper.defaultStandardHeaders('parties')
    }
    const throwError = new Error('Unknown error')
    sandbox.stub(parties, 'getPartiesByTypeAndID').rejects(throwError)

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(202)
    expect(parties.getPartiesByTypeAndID.callCount).toBe(1)
    expect(parties.getPartiesByTypeAndID.getCall(0).returnValue).rejects.toStrictEqual(throwError)

    // Cleanup
    parties.getPartiesByTypeAndID.restore()
  })

  it('getPartiesByTypeAndID endpoint sends async 3204 to /error for invalid party ID on response with status 400', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}', 'get')

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
      sandbox.stub(participant, 'sendErrorToParticipant').resolves({}),
      sandbox.stub(participant, 'validateParticipant').resolves(true),
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').resolves(['whatever']),
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').resolves(['whatever']),
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByCurrency').resolves(['whatever']),
      sandbox.stub(requestUtil, 'sendRequest').rejects(badRequestError)
    ]

    // Act
    const response = await server.inject(options)

    // Assert
    const errorCallStub = stubs[0]
    console.log(errorCallStub.args[0][2].errorInformation)
    expect(errorCallStub.args[0][2].errorInformation.errorCode).toBe('3204')
    expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR)
    expect(response.statusCode).toBe(202)

    // Cleanup
    stubs.forEach(s => s.restore())
  })

  // Added error 404 to cover a special case of the Mowali implementation
  // which uses mojaloop/als-oracle-pathfinder and currently returns 404.
  it('getPartiesByTypeAndID endpoint sends async 3201 to /error for invalid party ID on response with status 404', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}', 'get')

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
      [{ key: 'status', value: 404 }]
    )
    const stubs = [
      sandbox.stub(participant, 'sendErrorToParticipant').resolves({}),
      sandbox.stub(participant, 'validateParticipant').resolves(true),
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').resolves(['whatever']),
      sandbox.stub(requestUtil, 'sendRequest').rejects(badRequestError)
    ]

    // Act
    const response = await server.inject(options)

    // Assert
    const errorCallStub = stubs[0]
    expect(errorCallStub.args[0][2].errorInformation.errorCode).toBe('3201')
    expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR)
    expect(response.statusCode).toBe(202)

    // Cleanup
    stubs.forEach(s => s.restore())
  })

  it('putPartiesByTypeAndID endpoint', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}', 'put')
    const options = {
      method: 'put',
      url: mock.request.path,
      headers: Helper.defaultStandardHeaders('parties'),
      payload: mock.request.body
    }
    options.payload.party.personalInfo.complexName.firstName = 'Justin'
    options.payload.party.personalInfo.complexName.middleName = 'middle'
    options.payload.party.personalInfo.complexName.lastName = 'résumé'
    sandbox.stub(parties, 'putPartiesByTypeAndID').resolves({})

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(200)
  })

  it('putPartiesByTypeAndID endpoint with additional asian (Myanmar) unicode characters', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}', 'put')
    const options = {
      method: 'put',
      url: mock.request.path,
      headers: Helper.defaultStandardHeaders('parties'),
      payload: mock.request.body
    }
    options.payload.party.personalInfo.complexName.firstName = 'ကောင်းထက်စံ'
    options.payload.party.personalInfo.complexName.middleName = 'စုရီဒေါ်သန္တာထွန်အောင်စုရီ'
    options.payload.party.personalInfo.complexName.lastName = 'ဒေါ်အိမ့်ဧကရီငြိမ်းချမ်းအောင်'

    sandbox.stub(parties, 'putPartiesByTypeAndID').resolves({})

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(200)
  })
})
