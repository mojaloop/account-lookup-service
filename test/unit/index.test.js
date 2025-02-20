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

 * ModusBox
 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

/*
  For testing the server imports, we need to use jest.resetModules() between tests
  This means specifying future imports here and actually doing the importing in `beforeEach`
*/
let Sinon
let Command
let sandbox
const Config = require('../../src/lib/config')

describe('Base Tests', () => {
  beforeEach(() => {
    jest.resetModules()

    Sinon = require('sinon')
    Command = require('commander').Command

    sandbox = Sinon.createSandbox()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should display help if called with no args', () => {
    // Arrange
    const sandbox = Sinon.createSandbox()
    const mockInitStub = sandbox.stub()
    const helpStub = sandbox.stub(Command.prototype, 'help').returns(true)

    jest.mock('../../src/server.js', () => ({ initializeApi: mockInitStub, initializeAdmin: mockInitStub }))
    jest.mock('../../src/lib/argv.js', () => ({
      getArgs: () => []
    }))

    // Act
    require('../../src/index')
    // Assert
    // When starting with help, the help() method gets called
    expect(helpStub.callCount).toBe(1)
  })

  it('should start the server with the default config', () => {
    // Arrange
    const mockInitStub = sandbox.stub()
    const mockArgs = [
      'node',
      'src/index.js',
      'server'
    ]
    jest.mock('../../src/server.js', () => ({ initializeApi: mockInitStub, initializeAdmin: mockInitStub }))
    jest.mock('../../src/lib/argv.js', () => ({
      getArgs: () => mockArgs
    }))

    // Act
    require('../../src/index.js')

    // Assert
    // When starting with default args, both the admin and api servers get startec
    expect(mockInitStub.calledTwice).toBe(true)
  })

  it('should start the server with the --api config', () => {
    // Arrange
    const mockInitStub = sandbox.stub()
    const mockArgs = [
      'node',
      'src/index.js',
      'server',
      '--api'
    ]
    jest.mock('../../src/server.js', () => ({ initializeApi: mockInitStub }))
    jest.mock('../../src/lib/argv.js', () => ({
      getArgs: () => mockArgs
    }))

    // Act
    require('../../src/index.js')

    // Assert
    // When starting with default args, both the admin and api servers get startec
    expect(mockInitStub.callCount).toBe(1)
    const initStubArgs = mockInitStub.getCall(0).args
    expect(initStubArgs[0]).toStrictEqual(Config)
  })

  it('should start the server with the --admin config', () => {
    // Arrange
    const mockInitStub = sandbox.stub()
    const mockArgs = [
      'node',
      'src/index.js',
      'server',
      '--admin'
    ]
    jest.mock('../../src/server.js', () => ({ initializeAdmin: mockInitStub }))
    jest.mock('../../src/lib/argv.js', () => ({
      getArgs: () => mockArgs
    }))

    // Act
    require('../../src/index.js')

    // Assert
    // When starting with default args, both the admin and api servers get startec
    expect(mockInitStub.callCount).toBe(1)
    const initStubArgs = mockInitStub.getCall(0).args
    expect(initStubArgs[0]).toStrictEqual(Config)
  })
})
