/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const getPort = require('get-port')

const src = '../../../../../../src'

const initServer = require(`${src}/server`).initializeApi
const Db = require(`${src}/lib/db`)
const parties = require(`${src}/domain/parties`)
const ErrHandler = require(`${src}/api/parties/{Type}/{ID}/error`)
const Helper = require('../../../../../util/helper')
const LibUtil = require(`${src}/lib/util`)
const Logger = require('@mojaloop/central-services-logger')
const Config = require(`${src}/lib/config`)

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let server
let sandbox
const mockContext = jest.fn()

describe('/parties/{Type}/{ID}/error', () => {
  beforeAll(async () => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    Config.API_PORT = await getPort()
    server = await initServer(Config)
    sandbox.stub(LibUtil, 'getSpanTags').returns({})
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

    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}/error', 'put')
    const setTagsStub = sandbox.stub().returns({})

    mock.request = {
      log: sandbox.stub(),
      server: {
        log: sandbox.stub(),
        app: {}
      },
      params: sandbox.stub(),
      span: {
        setTags: setTagsStub,
        audit: sandbox.stub().returns(Promise.resolve({}))
      }
    }

    sandbox.stub(parties, 'putPartiesErrorByTypeAndID').resolves({})

    // Act
    await ErrHandler.put(mockContext, mock.request, handler)

    // Assert
    expect(codeStub.calledWith(200)).toBe(true)
    expect(setTagsStub.calledWith({})).toBe(true)
    expect(setTagsStub.calledTwice).toBe(true)
    expect(parties.putPartiesErrorByTypeAndID.callCount).toBe(1)
    expect(parties.putPartiesErrorByTypeAndID.getCall(0).returnValue).resolves.toStrictEqual({})
    expect(mock.request.server.log.callCount).toEqual(0)

    // Cleanup
    parties.putPartiesErrorByTypeAndID.restore()
  })

  it('handles error when putPartiesErrorByTypeAndID fails', async () => {
    // Arrange
    const codeStub = sandbox.stub()
    const handler = {
      response: sandbox.stub().returns({
        code: codeStub
      })
    }

    const mock = await Helper.generateMockRequest('/parties/{Type}/{ID}/error', 'put')
    const setTagsStub = sandbox.stub().returns({})

    mock.request = {
      log: sandbox.stub(),
      server: {
        log: sandbox.stub(),
        app: {}
      },
      params: sandbox.stub(),
      span: {
        setTags: setTagsStub,
        audit: sandbox.stub().returns(Promise.resolve({}))
      }
    }

    const throwError = new Error('Unknown error')
    sandbox.stub(parties, 'putPartiesErrorByTypeAndID').rejects(throwError)

    // Act
    await ErrHandler.put(mockContext, mock.request, handler)

    // Assert
    expect(parties.putPartiesErrorByTypeAndID.callCount).toBe(1)
    expect(parties.putPartiesErrorByTypeAndID.getCall(0).returnValue).rejects.toStrictEqual(throwError)
    expect(mock.request.server.log.callCount).toEqual(1)
    const logCatchCallArgs = mock.request.server.log.getCall(0).args
    expect(logCatchCallArgs[0]).toEqual(['error'])

    // Cleanup
    parties.putPartiesErrorByTypeAndID.restore()
  })
})
