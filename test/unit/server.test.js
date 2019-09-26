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

const Sinon = require('sinon')
// const Logger = require('@mojaloop/central-services-logger')
// const Proxyquire = require('proxyquire')
// const Path = require('path')
// const Config = require('../../src/lib/config')
const Db = require('../../src/lib/db')
// const SetupProxy = require('../../src/server')

// Jest Mocks
// const hapi = require('@hapi/hapi')
// jest.mock('@hapi/hapi')
// 'hapi-openapi': HapiOpenAPIStub,
// './lib/config': ConfigStub,
// '@mojaloop/central-services-database': DbStub

let sandbox
// let serverStub
// let HapiStub
// let HapiOpenAPIStub
// let PathStub
// let ConfigStub
// let SetupProxy

describe('server', () => {
  beforeEach(() => {
    sandbox = Sinon.createSandbox()

    // serverStub = {
    //   register: sandbox.stub(),
    //   method: sandbox.stub(),
    //   start: sandbox.stub(),
    //   log: sandbox.stub(),
    //   plugins: {
    //     openapi: {
    //       setHost: Sinon.spy()
    //     }
    //   },
    //   info: {
    //     port: Config.PORT
    //   },
    //   ext: Sinon.spy()
    //   // ext: {
    //   //   type: sandbox.stub(),
    //   //   method: sandbox.stub()
    //   // }
    // }
    // HapiStub = {
    //   Server: sandbox.stub().returns(serverStub)
    // }
    // DbStub = sandbox.stub()
    // HapiOpenAPIStub = sandbox.stub()
    // PathStub = Path
    // ConfigStub = Config

    // TODO: figure out proxyquire with jest
    // proxyquire is overriding the imports for the following modules with the following
    // SetupProxy = Proxyquire('../../src/server', {
    //   '@hapi/hapi': HapiStub,
    //   'hapi-openapi': HapiOpenAPIStub,
    //   path: PathStub,
    //   './lib/config': ConfigStub,
    //   '@mojaloop/central-services-database': DbStub
    // })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('initialize()', async () => {
    // Arrange
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))

    // Act
    // const server = await SetupProxy.initialize()

    // Assert
    // expect(hapi)
    expect(true).toBe(true)
    // test.assert(server, 'return server object')
    // test.assert(HapiStub.Server.calledOnce, 'Hapi.Server called once')
    // test.assert(serverStub.start.calledOnce, 'server.start called once')
    // test.assert(serverStub.plugins.openapi.setHost.calledOnce, 'server.plugins.openapi.setHost called once')
  })
})
