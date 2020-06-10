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

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const getPort = require('get-port')

const src = '../../../../../../../src'
const initServer = require(`${src}/server`).initializeApi
const Db = require(`${src}/lib/db`)
const parties = require(`${src}/domain/parties`)
const ErrHandler = require(`${src}/handlers/parties/{Type}/{ID}/{SubId}/error`)
const Helper = require('../../../../../../util/helper')

let server
let sandbox
const mockContext = jest.fn()

describe('/parties/{Type}/{ID}/{SubId}/error', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    server = await initServer(await getPort())
  })

  afterAll(async () => {
    await server.stop()
    sandbox.restore()
  })

  it('handles PUT /error', async () => {
    // Arrange
    const handler = {
      response: sandbox.stub()
    }

    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}/{SubId}/error', 'put')
    sandbox.stub(parties, 'getPartiesByTypeAndID').returns({})

    // Act
    ErrHandler.put(mockContext, mock.request, handler)

    // Assert
    expect(handler.response.calledOnce).toBe(true)
  })
})
