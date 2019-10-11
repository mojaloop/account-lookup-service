
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

const src = '../../../../../../src'

const initServer = require(`${src}/server`).initialize
const Db = require(`${src}/lib/db`)
const participants = require(`${src}/domain/participants`)
const ErrHandler = require(`${src}/handlers/participants/{Type}/{ID}/error`)
const Helper = require('../../../../../util/helper')

let server
let sandbox

describe('/participants/{Type}/{ID}/error', () => {
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
    const codeStub = sandbox.stub()
    const handler = {
      response: sandbox.stub().returns({
        code: codeStub
      })
    }

    const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/error', 'put')
    sandbox.stub(participants, 'putParticipantsErrorByTypeAndID').returns({})
    mock.request.server = {
      log: sandbox.stub()
    }

    // Act
    await ErrHandler.put(mock.request, handler)

    // Assert
    /*
      Note - since the `put` function always returns a 202 response, it doesn't propagate
      errors properly. Instead of failing the test on an error, we can inspect the 2nd call
      of the `log` function, and ensure it was as expected.
    */

    const secondCallArgs = mock.request.server.log.getCall(1).args
    expect(secondCallArgs[0]).toEqual(['info'])
    participants.putParticipantsErrorByTypeAndID.restore()
  })

  it('handles error when putPartiesErrorByTypeAndID fails', async () => {
    // Arrange
    const codeStub = sandbox.stub()
    const handler = {
      response: sandbox.stub().returns({
        code: codeStub
      })
    }

    const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/error', 'put')
    sandbox.stub(participants, 'putParticipantsErrorByTypeAndID').throws(new Error('Error in putParticipantsErrorByTypeAndID'))
    mock.request.server = {
      log: sandbox.stub()
    }

    // Act
    await ErrHandler.put(mock.request, handler)

    // Assert
    /*
      Note - since the `put` function always returns a 202 response, we can't catch
      the error when testing this. Instead, we test this by ensuring the `server.log` method is called with "ERROR"
    */

    const secondCallArgs = mock.request.server.log.getCall(1).args
    expect(secondCallArgs[0]).toEqual(['error'])
    participants.putParticipantsErrorByTypeAndID.restore()
  })
})
