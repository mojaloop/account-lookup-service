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

const oracle = require('../../../src/domain/oracle')
const Sinon = require('sinon')
const Helper = require('../../util/helper')
const initServer = require('../../../src/server').initialize
const Db = require('../../../src/lib/db')
const getPort = require('get-port')
const Migrator = require('../../../src/lib/migrator')

const getResponse = [{
  oracleId: '1',
  oracleIdType: 'MSISDN',
  endpoint: {
    value: 'http://localhost:8444',
    endpointType: 'URL'
  },
  isDefault: true
}]

let sandbox
let server

describe('/oracles', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    sandbox.stub(Migrator, 'migrate').returns(Promise.resolve({}))
    server = await initServer(await getPort(), false)
  })

  afterAll(async () => {
    await server.stop()
    sandbox.restore()
  })

  /**
   * summary: Get Oracles
   * description: The HTTP request GET /oracles is used to return the list of all oracle endpoints. There are optional fields for type and currency i.e. /admin/oracles?type=MSISDN&amp;currency=USD which can be used to get more filtered results or a specific entry
   * parameters: type, currency, accept, content-type, date
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  it('GET /oracle', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/oracles', 'get', false)

    // Get the resolved path from mock request
    // Mock request Path templates({}) are resolved using path parameters
    const options = {
      method: 'get',
      url: mock.request.path,
      headers: Helper.defaultAdminHeaders()
    }
    sandbox.stub(oracle, 'getOracle').returns(Promise.resolve(getResponse))

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(200)
    oracle.getOracle.restore()
  })

  it('GET /oracle throws on error', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/oracles', 'get', false)

    // Get the resolved path from mock request
    // Mock request Path templates({}) are resolved using path parameters
    const options = {
      method: 'get',
      url: mock.request.path,
      headers: Helper.defaultAdminHeaders()
    }
    sandbox.stub(oracle, 'getOracle').throws(new Error('Error Thrown'))

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(500)
    oracle.getOracle.restore()
  })

  /**
   * summary: Create Oracles
   * description: The HTTP request POST /oracles is used to create information in the server regarding the provided oracles. This request should be used for creation of Oracle information.
   * parameters: body, accept, content-length, content-type, date
   * produces: application/json
   * responses: 201, 400, 401, 403, 404, 405, 406, 501, 503
   */
  it('POST /oracle', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/oracles', 'post', false)

    // Get the resolved path from mock request
    // Mock request Path templates({}) are resolved using path parameters
    const options = {
      method: 'post',
      url: mock.request.path,
      headers: Helper.defaultAdminHeaders(),
      payload: mock.request.body
    }

    sandbox.stub(oracle, 'createOracle').returns(Promise.resolve({}))

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(201)
    oracle.createOracle.restore()
  })

  it('POST /oracle throws error', async () => {
    // Arrange
    const mock = await Helper.generateMockRequest('/oracles', 'post', false)

    // Get the resolved path from mock request
    // Mock request Path templates({}) are resolved using path parameters
    const options = {
      method: 'post',
      url: mock.request.path,
      headers: Helper.defaultAdminHeaders(),
      payload: mock.request.body
    }
    sandbox.stub(oracle, 'createOracle').throws(new Error('Error Thrown'))

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(500)
    oracle.createOracle.restore()
  })
})
