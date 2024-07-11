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
 - Steven Oderayi <steven.oderayi@modusbox.com>

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

'use strict'

const Helper = require('../../util/helper')
const Db = require('../../../src/lib/db')
const initServer = require('../../../src/server').initializeApi
const getPort = require('get-port')
const Sinon = require('sinon')
const MigrationLockModel = require('../../../src/models/misc/migrationLock')
const Logger = require('@mojaloop/central-services-logger')
const Config = require('../../../src/lib/config')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let sandbox
let server

describe('/health', () => {
  beforeEach(async () => {
    Config.proxyCacheConfig.enabled = false
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    Config.API_PORT = await getPort()
    server = await initServer(Config)
  })

  afterEach(async () => {
    await server.stop()
    sandbox.restore()
  })

  /**
   * summary: Get Health
   * description: The HTTP request GET /health is used to get the status of the server
   * parameters: type, currency, accept, content-type, date
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  it('GET /health', async () => {
    // Arrange
    sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(false)
    const mock = await Helper.generateMockRequest('/health', 'get')

    const options = {
      method: 'get',
      url: mock.request.path,
      headers: Helper.defaultAdminHeaders()
    }

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(200)
    const payload = JSON.parse(response.payload)
    expect(payload.status).toBe('OK')
    expect(payload.services.length).toBe(1)
    expect(payload.services[0].name).toBe('datastore')
  })

  it('GET /health service unavailable', async () => {
    // Arrange
    sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(true)
    const mock = await Helper.generateMockRequest('/health', 'get')

    const options = {
      method: 'get',
      url: mock.request.path,
      headers: Helper.defaultAdminHeaders()
    }

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(503)
    const payload = JSON.parse(response.payload)
    expect(payload.status).toBe('DOWN')
    expect(payload.services.length).toBe(1)
    expect(payload.services[0].name).toBe('datastore')
  })

  it('GET /health should include proxy health', async () => {
    // Arrange
    Config.proxyCacheConfig.enabled = true
    Config.API_PORT = await getPort()
    let serverWithProxy
    try {
      serverWithProxy = await initServer(Config)
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').resolves(false)
      const mock = await Helper.generateMockRequest('/health', 'get')

      const options = {
        method: 'get',
        url: mock.request.path,
        headers: Helper.defaultAdminHeaders()
      }

      // Act
      const response = await serverWithProxy.inject(options)

      // Assert
      const payload = JSON.parse(response.payload)
      expect(response.statusCode).toBe(200)
      expect(payload.services.length).toBe(2)
      expect(payload.services[1].name).toBe('proxyCache')
    } finally {
      serverWithProxy && await serverWithProxy.stop()
    }
  })
})
