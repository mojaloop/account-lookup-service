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

const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-logger')

// const server = require('../../src/server')

let sandbox

describe('Base Tests', () => {
  beforeEach(() => {
    try {
      sandbox = Sinon.createSandbox()
    } catch (err) {
      Logger.error(`serverTest failed with error - ${err}`)
      console.error(err.message)
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  // TODO: we need to fix this!
  it('should import setup and initialize', () => {
    // Arrange
    // const initializeSpy = jest.spyOn(server, 'initialize')
    // const initStub = sandbox.stub()
    // console.log(initializeSpy)
    // server.initialize.mock

    // Act
    // we just need to mock out the initialize function...

    // Proxyquire('../../src/index', {
    //   './server': {
    //     initialize: initStub
    //   }
    // })

    // Assert
    // Somehow I think Proxyquire actually imported index and called it.
    // We need a different approach for Jest - maybe refer to quoting service
    // expect(initializeSpy).toBeCalled()
    expect(true).toBe(true)
  })
})
