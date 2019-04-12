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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/

'use strict'

const setupTest = require('ava')
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const Proxyquire = require('proxyquire')
const Path = require('path')
const Config = require('../../src/lib/config')
const Db = require('@mojaloop/central-services-database').Db

let sandbox
let serverStub
let HapiStub
let HapiOpenAPIStub
let PathStub
let ConfigStub
let SetupProxy
let DbStub

setupTest.beforeEach(() => {
  try {
    sandbox = Sinon.createSandbox()

    serverStub = {
      register: sandbox.stub(),
      method: sandbox.stub(),
      start: sandbox.stub(),
      log: sandbox.stub(),
      plugins: {
        openapi: {
          setHost: Sinon.spy()
        }
      },
      info: {
        port: Config.PORT
      },
      ext: Sinon.spy()
      // ext: {
      //   type: sandbox.stub(),
      //   method: sandbox.stub()
      // }
    }
    HapiStub = {
      Server: sandbox.stub().returns(serverStub)
    }
    DbStub = sandbox.stub()
    HapiOpenAPIStub = sandbox.stub()
    PathStub = Path
    ConfigStub = Config

    SetupProxy = Proxyquire('../../src/server', {
      'hapi': HapiStub,
      'hapi-openapi': HapiOpenAPIStub,
      'path': PathStub,
      './lib/config': ConfigStub,
      '@mojaloop/central-services-database': DbStub
    })
  } catch (err) {
    Logger.error(`setupTest failed with error - ${err}`)
  }
})

setupTest.afterEach(() => {
  sandbox.restore()
})

setupTest('initialize ', async test => {
  try {
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    let server = await SetupProxy.initialize()
    test.assert(server, 'return server object')
    test.assert(HapiStub.Server.calledOnce, 'Hapi.Server called once')
    test.assert(serverStub.start.calledOnce, 'server.start called once')
    test.assert(serverStub.plugins.openapi.setHost.calledOnce, 'server.plugins.openapi.setHost called once')
  } catch (err) {
    Logger.error(`init failed with error - ${err}`)
    test.fail()
  }
})
