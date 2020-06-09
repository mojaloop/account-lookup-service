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
const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend
const Path = require('path')

const { registerPlugins } = require('../../src/plugins')
const Config = require('../../src/lib/config')
const Handlers = require('../../src/handlers')

let sandbox

describe('Plugin Tests', () => {
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should change the title based on the API_PORT', async () => {
    // Arrange
    const server = {
      register: sandbox.spy(),
      info: {
        port: '8000'
      }
    }
    const api = await OpenapiBackend.initialise(Path.resolve(__dirname, '../../src/interface/api-swagger.yaml'), Handlers.ApiHandlers)

    sandbox.mock(Config)
    Config.API_PORT = '8000'

    // Act
    await registerPlugins(server, api)

    // Assert
    expect(server.register.callCount).toBe(9)
    const firstCallArgs = server.register.getCall(0).args
    expect(firstCallArgs[0].options.info.title).toBe('ALS API Swagger Documentation')
  })

  it('should not register Blipp if DISPLAY_ROUTES is false', async () => {
    // Arrange
    const server = {
      register: sandbox.spy(),
      info: {
        port: '8000'
      }
    }
    const api = await OpenapiBackend.initialise(Path.resolve(__dirname, '../../src/interface/api-swagger.yaml'), Handlers.ApiHandlers)
    sandbox.mock(Config)
    Config.DISPLAY_ROUTES = false

    // Act
    await registerPlugins(server, api)

    // Assert
    expect(server.register.callCount).toBe(8)
  })
})
