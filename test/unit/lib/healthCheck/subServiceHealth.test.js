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

 * Lewis Daly <lewis@vesselstech.com>
 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const { statusEnum, serviceName } = require('@mojaloop/central-services-shared').HealthCheck.HealthCheckEnums
const MigrationLockModel = require('../../../../src/models/misc/migrationLock')
const { getSubServiceHealthDatastore } = require('../../../../src/lib/healthCheck/subServiceHealth.js')

describe('SubServiceHealth test', () => {
  let sandbox

  beforeEach(() => {
    sandbox = Sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('getSubServiceHealthDatastore', () => {
    it('datastore test passes when the database is not migration locked', async () => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(false)
      const expected = { name: serviceName.datastore, status: statusEnum.OK }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      expect(result).toEqual(expected)
      expect(MigrationLockModel.getIsMigrationLocked.called).toBe(true)
    })

    it('datastore test fails when the database is migration locked', async () => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(true)
      const expected = { name: serviceName.datastore, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      expect(result).toEqual(expected)
      expect(MigrationLockModel.getIsMigrationLocked.called).toBe(true)
    })

    it('datastore test fails when getIsMigrationLocked throws', async () => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').throws(new Error('Error connecting to db'))
      const expected = { name: serviceName.datastore, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      expect(result).toEqual(expected)
      expect(MigrationLockModel.getIsMigrationLocked.called).toBe(true)
    })
  })
})
