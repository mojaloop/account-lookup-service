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

const { getPartyIdTypeByName } = require('../../../../src/models/partyIdType/partyIdType')
const Db = require('../../../../src/lib/db')

describe('partyIdType Model', () => {
  let sandbox

  beforeEach(() => {
    sandbox = Sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('Gets the partyIdType by name', async () => {
    // Arrange
    const partyIdType = {
      partyIdTypeId: 1,
      name: 'MSISDN',
      description: 'A MSISDN (Mobile Station International Subscriber Directory Number, that is, the phone number)',
      isActive: true,
      createdDate: '2019-05-24 08:52:19'
    }
    Db.partyIdType = {
      findOne: sandbox.stub().resolves(partyIdType)
    }

    // Act
    const response = await getPartyIdTypeByName('MSISDN')

    // Assert
    expect(response).toEqual(partyIdType)
  })

  it('throws an error if Db call fails', async () => {
    // Arrange
    Db.partyIdType = {
      findOne: sandbox.stub().throws(new Error('Error finding partyIdType'))
    }

    // Act
    const action = async () => getPartyIdTypeByName('MSISDN')

    // Assert
    await expect(action()).rejects.toThrowError(new RegExp('Error finding partyIdType'))
  })
})
