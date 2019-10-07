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
const initServer = require('../../../../../src/server').initialize
const Db = require('../../../../../src/lib/db')
const oracleEndpoint = require('../../../../../src/models/oracle')
const parties = require('../../../../../src/domain/parties')
const participant = require('../../../../../src/models/participantEndpoint/facade')
const getPort = require('get-port')
const Helper = require('../../../../util/helper')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const requestUtil = require('@mojaloop/central-services-shared').Util.Request
const Enums = require('@mojaloop/central-services-shared').Enum

let server
let sandbox

describe('/parties', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    server = await initServer(await getPort())
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
    sandbox.stub(parties, 'getPartiesByTypeAndID').returns({})

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(202)
    parties.getPartiesByTypeAndID.restore()
  })

  it('getPartiesByTypeAndID endpoint sends async 3200 to /error for invalid party ID', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}', 'get')
    const options = {
      method: 'get',
      url: mock.request.path,
      headers: Helper.defaultStandardHeaders('parties')
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
    expect(errorCallStub.args[0][1]).toBe(Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR)
    expect(response.statusCode).toBe(202)
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
    sandbox.stub(parties, 'putPartiesByTypeAndID').returns({})

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(200)
  })
})
