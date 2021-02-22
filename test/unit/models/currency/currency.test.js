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

const Db = require('../../../../src/lib/db')
const { getCurrencyById } = require('../../../../src/models/currency')

let sandbox

describe('currency model', () => {
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

  describe('getCurrencyById', () => {
    it('gets a currency by id', async () => {
      // Arrange
      const expected = {
        currencyId: 'AUD',
        name: 'Australian Dollars',
        isActive: true,
        createdDate: (new Date()).toISOString()
      }
      const findOneStub = sandbox.stub()
      findOneStub.resolves(expected)
      Db.currency = {
        findOne: findOneStub
      }

      // Act
      const result = await getCurrencyById('AUD')

      // Assert
      expect(result).toMatchObject(expected)
      expect(findOneStub.calledOnce).toBe(true)
    })

    it('Errors when cannot find a currency', async () => {
      // Arrange
      const findOneStub = sandbox.stub()
      findOneStub.throws(new Error('Error finding currency'))
      Db.currency = {
        findOne: findOneStub
      }

      // Act
      const action = async () => getCurrencyById('XXX')

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })
})
