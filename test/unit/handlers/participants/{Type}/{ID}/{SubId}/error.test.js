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
const initServer = require('../../../../../../../src/server').initializeApi
const Db = require('../../../../../../../src/lib/db')
const participants = require('../../../../../../../src/domain/participants')
const ErrHandler = require('../../../../../../../src/api/participants/{Type}/{ID}/{SubId}/error')
const Helper = require('../../../../../../util/helper')
const Logger = require('@mojaloop/central-services-logger')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let server
let sandbox
const mockContext = jest.fn()

describe('/participants/{Type}/{ID}/{SubId}/error', () => {
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

    const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}/error', 'put')
    sandbox.stub(participants, 'putParticipantsErrorByTypeAndID').resolves({})
    mock.request.server = {
      log: sandbox.stub()
    }

    // Act
    await ErrHandler.put(mockContext, mock.request, handler)

    // Assert
    /*
      Note - since the `put` function always returns a 202 response, it doesn't propagate
      errors properly. Instead of failing the test on an error, we can inspect the 2nd call
      of the `log` function, and ensure it was as expected.
    */

    expect(participants.putParticipantsErrorByTypeAndID.callCount).toBe(1)
    expect(participants.putParticipantsErrorByTypeAndID.getCall(0).returnValue).resolves.toStrictEqual({})
    expect(mock.request.server.log.callCount).toEqual(2)
    const secondCallArgs = mock.request.server.log.getCall(1).args
    expect(secondCallArgs[0]).toEqual(['info'])

    // Cleanup
    participants.putParticipantsErrorByTypeAndID.restore()
  })

  it('handles error when putParticipantsErrorByTypeAndID fails', async () => {
    // Arrange
    const codeStub = sandbox.stub()
    const handler = {
      response: sandbox.stub().resolves({
        code: codeStub
      })
    }
    const throwError = new Error('Error in putParticipantsErrorByTypeAndID')
    const mock = await Helper.generateMockRequest('/participants/{Type}/{ID}/{SubId}/error', 'put')
    sandbox.stub(participants, 'putParticipantsErrorByTypeAndID').rejects(throwError)
    mock.request.server = {
      log: sandbox.stub()
    }

    // Act
    try {
      await ErrHandler.put(mockContext, mock.request, handler)
    } catch (err) {
      // Assert
      /*
        Note - since the `put` function always returns a 202 response, we can't catch
        the error when testing this. Instead, we test this by ensuring the `server.log` method is called with "ERROR"
      */

      expect(participants.putParticipantsErrorByTypeAndID.callCount).toBe(1)
      expect(participants.putParticipantsErrorByTypeAndID.getCall(0).returnValue).rejects.toStrictEqual(throwError)
      expect(mock.request.server.log.callCount).toEqual(3)
      const secondCallArgs = mock.request.server.log.getCall(1).args
      expect(secondCallArgs[0]).toEqual(['info'])
      const logCatchCallArgs = mock.request.server.log.getCall(2).args
      expect(logCatchCallArgs[0]).toEqual(['error'])
    }

    // Cleanup
    participants.putParticipantsErrorByTypeAndID.restore()
  })
})
