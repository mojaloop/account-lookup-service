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

const Mockgen = require('../../../util/mockgen.js')
const helper = require('../../../util/helper')
const Sinon = require('sinon')
const oracle = require('../../../../src/domain/oracle')
const initServer = require('../../../../src/server').initialize
const getPort = require('get-port')
const Db = require('../../../../src/lib/db')
const Migrator = require('../../../../src/lib/migrator')

let sandbox
let server

describe('/oracles/{ID} handler', () => {
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
   * summary: Update Oracle
   * description: The HTTP request PUT /oracles/{ID} is used to update information in the server regarding the provided oracle. This request should be used for individual update of Oracle information.
   * parameters: body, ID, content-length, content-type, date
   * produces: application/json
   * responses: 204, 400, 401, 403, 404, 405, 406, 501, 503
   */
  it('PUT /oracles/{ID}', async () => {
    // Arrange
    const requests = new Promise((resolve, reject) => {
      Mockgen(false).requests({
        path: '/oracles/{ID}',
        operation: 'put'
      }, function (error, mock) {
        return error ? reject(error) : resolve(mock)
      })
    })

    const mock = await requests

    /*
      Get the resolved path from mock request
      Mock request Path templates({}) are resolved using path parameters
    */
    const options = {
      method: 'put',
      url: mock.request.path,
      headers: helper.defaultAdminHeaders()
    }
    if (mock.request.body) {
      // Send the request body
      options.payload = mock.request.body
    } else if (mock.request.formData) {
      // Send the request form data
      options.payload = mock.request.formData
      // Set the Content-Type as application/x-www-form-urlencoded
      options.headers = options.headers || {}
      options.headers = helper.defaultAdminHeaders()
    }
    // If headers are present, set the headers.
    if (mock.request.headers && mock.request.headers.length > 0) {
      options.headers = mock.request.headers
    }
    sandbox.stub(oracle, 'updateOracle').returns(Promise.resolve({}))

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(204)
    oracle.updateOracle.restore()
  })

  /**
   * summary: Delete Oracle
   * description: The HTTP request DELETE /oracles/{ID} is used to delete information in the server regarding the provided oracle.
   * parameters: accept, ID, content-type, date
   * produces: application/json
   * responses: 204, 400, 401, 403, 404, 405, 406, 501, 503
   */
  it('PUT /oracles/{ID}', async () => {
    // Arrange
    const requests = new Promise((resolve, reject) => {
      Mockgen(false).requests({
        path: '/oracles/{ID}',
        operation: 'delete'
      }, function (error, mock) {
        return error ? reject(error) : resolve(mock)
      })
    })

    const mock = await requests

    /*
      Get the resolved path from mock request
      Mock request Path templates({}) are resolved using path parameters
    */
    const options = {
      method: 'delete',
      url: '' + mock.request.path,
      headers: helper.defaultAdminHeaders()
    }
    if (mock.request.body) {
      // Send the request body
      options.payload = mock.request.body
    } else if (mock.request.formData) {
      // Send the request form data
      options.payload = mock.request.formData
      // Set the Content-Type as application/x-www-form-urlencoded
      options.headers = options.headers || {}
      options.headers = helper.defaultAdminHeaders()
    }
    // If headers are present, set the headers.
    if (mock.request.headers && mock.request.headers.length > 0) {
      options.headers = mock.request.headers
    }
    sandbox.stub(oracle, 'deleteOracle').returns(Promise.resolve({}))

    // Act
    const response = await server.inject(options)

    // Assert
    expect(response.statusCode).toBe(204)
    oracle.deleteOracle.restore()
  })
})
