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

const Db = require('../../../../src/lib/db')
const { getEndpointTypeByType } = require('../../../../src/models/endpointType')
const Logger = require('@mojaloop/central-services-logger')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let sandbox

describe('endpointType model', () => {
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    Db.from = (table) => {
      return Db[table]
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('getEndpointTypeByType', () => {
    it('Errors when cannot find an endpointType', async () => {
      // Arrange
      const findOneStub = sandbox.stub()
      findOneStub.throws(new Error('Error finding endpointType'))
      Db.endpointType = {
        findOne: findOneStub
      }

      // Act
      const action = async () => getEndpointTypeByType('XXX')

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })
})
