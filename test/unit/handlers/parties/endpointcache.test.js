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
 - Juan Correa <juan.correa@modusbox.com>

 --------------
 ******/

'use strict'

const Helper = require('../../../util/helper')
const Db = require('../../../../src/lib/db')
const initServer = require('../../../../src/server').initializeApi
const getPort = require('get-port')
const Sinon = require('sinon')
const MigrationLockModel = require('../../../../src/models/misc/migrationLock')
const Logger = require('@mojaloop/central-services-logger')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let sandbox
let server

describe('/endpointcache', () => {
  beforeEach(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    server = await initServer(await getPort())
  })

  afterEach(async () => {
    await server.stop()
    sandbox.restore()
  })

  /**
   * summary: DELETE endpointcache
   * description: The HTTP request DELETE /endpointcache is used to reset the endpoint cache by performing an stopCache and initializeCache the Admin API.",
   * parameters: date
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */
  it('DELETE /endpointcache', async () => {
    // Arrange
    sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(false)
    const mock = await Helper.generateMockRequest('/endpointcache', 'delete')

    const options = {
      method: 'delete',
      url: mock.request.path,
      headers: Helper.defaultAdminHeaders()
    }

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(202)
  })
})
