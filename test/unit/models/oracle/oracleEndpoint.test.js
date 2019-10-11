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
const oracleEndpoint = require('../../../../src/models/oracle/oracleEndpoint')

let sandbox

const getOracleDatabaseResponse = [{
  oracleEndpointId: 1,
  endpointType: 'URL',
  value: 'http://localhost:8444',
  idType: 'MSISDN',
  currency: 'USD',
  isDefault: true
}]

const createOracleModel = {
  oracleEndpointId: 1,
  endpointType: 'URL',
  value: 'http://localhost:8444',
  idType: 'MSISDN',
  currency: 'USD'
}

describe('oracleEndpoint', () => {
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('getOracleEndpointByType', () => {
    let queryStub

    beforeEach(() => {
      queryStub = sandbox.stub()
      Db.oracleEndpoint = {
        query: queryStub
      }
    })

    it('gets an oracleEndpoint by type', async () => {
      // Arrange
      queryStub.resolves(getOracleDatabaseResponse)

      // Act
      const result = await oracleEndpoint.getOracleEndpointByType('URL')

      // Assert
      expect(queryStub.calledOnce).toBe(true)
      expect(result).toStrictEqual(getOracleDatabaseResponse)
    })

    it('gets an oracleEndpoint by type with builder', async () => {
      // Arrange
      const builderStub = sandbox.stub()
      builderStub.innerJoin = sandbox.stub().returns({
        innerJoin: sandbox.stub().returns({
          where: sandbox.stub().returns({
            select: sandbox.stub().resolves(getOracleDatabaseResponse)
          })
        })
      })
      Db.oracleEndpoint.query.callsArgWith(0, builderStub)

      // Act
      const result = await oracleEndpoint.getOracleEndpointByType('URL')

      // Assert
      expect(result).toStrictEqual(getOracleDatabaseResponse)
    })

    it('fails to get an oracleEndpoint', async () => {
      // Arrange
      queryStub.throws(new Error('failed to get oracleEndpoint'))

      // Act
      const action = async () => oracleEndpoint.getOracleEndpointByType('123')

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })

  describe('getOracleEndpointByTypeAndCurrency', () => {
    let queryStub

    beforeEach(() => {
      queryStub = sandbox.stub()
      Db.oracleEndpoint = {
        query: queryStub
      }
    })

    it('gets an oracleEndpoint by type and currency', async () => {
      // Arrange
      const builderStub = sandbox.stub()
      builderStub.innerJoin = sandbox.stub().returns({
        innerJoin: sandbox.stub().returns({
          innerJoin: sandbox.stub().returns({
            where: sandbox.stub().returns({
              select: sandbox.stub().resolves(getOracleDatabaseResponse)
            })
          })
        })
      })
      Db.oracleEndpoint.query.callsArgWith(0, builderStub)

      // Act
      const result = await oracleEndpoint.getOracleEndpointByTypeAndCurrency('URL', 'USD')

      // Assert
      expect(queryStub.calledOnce).toBe(true)
      expect(result).toStrictEqual(getOracleDatabaseResponse)
    })

    it('fails to get an oracleEndpoint by type and currency', async () => {
      // Arrange
      queryStub.throws(new Error('failed to get oracleEndpoint'))

      // Act
      const action = async () => oracleEndpoint.getOracleEndpointByTypeAndCurrency('URL', 'USD')

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })

  describe('getOracleEndpointByCurrency', () => {
    let queryStub

    beforeEach(() => {
      queryStub = sandbox.stub()
      Db.oracleEndpoint = {
        query: queryStub
      }
    })

    it('gets an oracleEndpoint by currency', async () => {
      // Arrange
      const builderStub = sandbox.stub()
      builderStub.innerJoin = sandbox.stub().returns({
        innerJoin: sandbox.stub().returns({
          innerJoin: sandbox.stub().returns({
            where: sandbox.stub().returns({
              select: sandbox.stub().resolves(getOracleDatabaseResponse)
            })
          })
        })
      })
      Db.oracleEndpoint.query.callsArgWith(0, builderStub)

      // Act
      const result = await oracleEndpoint.getOracleEndpointByCurrency('USD')

      // Assert
      expect(queryStub.calledOnce).toBe(true)
      expect(result).toStrictEqual(getOracleDatabaseResponse)
    })

    it('fails to get an oracleEndpoint by currency', async () => {
      // Arrange
      queryStub.throws(new Error('failed to get oracleEndpoint'))

      // Act
      const action = async () => oracleEndpoint.getOracleEndpointByCurrency('USD')

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })

  describe('getOracleEndpointById', () => {
    let queryStub

    beforeEach(() => {
      queryStub = sandbox.stub()
      Db.oracleEndpoint = {
        query: queryStub
      }
    })

    it('gets an oracleEndpoint by Id', async () => {
      // Arrange
      const builderStub = sandbox.stub()
      builderStub.innerJoin = sandbox.stub().returns({
        innerJoin: sandbox.stub().returns({
          innerJoin: sandbox.stub().returns({
            where: sandbox.stub().returns({
              select: sandbox.stub().resolves(getOracleDatabaseResponse)
            })
          })
        })
      })
      Db.oracleEndpoint.query.callsArgWith(0, builderStub)

      // Act
      const result = await oracleEndpoint.getOracleEndpointById('1')

      // Assert
      expect(queryStub.calledOnce).toBe(true)
      expect(result).toStrictEqual(getOracleDatabaseResponse)
    })

    it('fails to get an oracleEndpoint by Id', async () => {
      // Arrange
      queryStub.throws(new Error('failed to get oracleEndpoint'))

      // Act
      const action = async () => oracleEndpoint.getOracleEndpointById('1')

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })

  describe('getAllOracleEndpoint', () => {
    let queryStub

    beforeEach(() => {
      queryStub = sandbox.stub()
      Db.oracleEndpoint = {
        query: queryStub
      }
    })

    it('gets all oracle endpoints', async () => {
      // Arrange
      const builderStub = sandbox.stub()
      builderStub.innerJoin = sandbox.stub().returns({
        innerJoin: sandbox.stub().returns({
          where: sandbox.stub().returns({
            select: sandbox.stub().resolves(getOracleDatabaseResponse)
          })
        })
      })
      Db.oracleEndpoint.query.callsArgWith(0, builderStub)

      // Act
      const result = await oracleEndpoint.getAllOracleEndpoint('1')

      // Assert
      expect(queryStub.calledOnce).toBe(true)
      expect(result).toStrictEqual(getOracleDatabaseResponse)
    })
  })

  describe('createOracleEndpoint', () => {
    let insertStub

    beforeEach(() => {
      insertStub = sandbox.stub()
      Db.oracleEndpoint = {
        insert: insertStub
      }
    })

    it('creates an oracleEndpoint by Id', async () => {
      // Arrange
      insertStub.resolves(true)

      // Act
      const result = await oracleEndpoint.createOracleEndpoint(createOracleModel)

      // Assert
      expect(insertStub.calledOnce).toBe(true)
      expect(result).toBe(true)
    })

    it('fails to create an oracleEndpoint by Id', async () => {
      // Arrange
      insertStub.throws(new Error('failed to create oracle endpoint'))

      // Act
      const action = async () => oracleEndpoint.createOracleEndpoint(createOracleModel)

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })

  describe('updateOracleEndpointById', () => {
    let updateStub

    beforeEach(() => {
      updateStub = sandbox.stub()
      Db.oracleEndpoint = {
        update: updateStub
      }
    })

    it('fails to update an oracleEndpoint by Id', async () => {
      // Arrange
      updateStub.throws(new Error('failed to create oracle endpoint'))

      // Act
      const action = async () => oracleEndpoint.updateOracleEndpointById(createOracleModel)

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })

  describe('setIsActiveOracleEndpoint', () => {
    let updateStub

    beforeEach(() => {
      updateStub = sandbox.stub()
      Db.oracleEndpoint = {
        update: updateStub
      }
    })

    it('sets the active oracleEndpoint', async () => {
      // Arrange
      updateStub.resolves(true)

      // Act
      const result = await oracleEndpoint.setIsActiveOracleEndpoint('USD', true)

      // Assert
      expect(updateStub.calledOnce).toBe(true)
      expect(result).toBe(true)
    })

    it('fails to set the active oracleEndpoint', async () => {
      // Arrange
      updateStub.throws(new Error('failed to set active oracle endpoint'))

      // Act
      const action = async () => oracleEndpoint.setIsActiveOracleEndpoint('USD', true)

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })

  describe('destroyOracleEndpointById', () => {
    let updateStub

    beforeEach(() => {
      updateStub = sandbox.stub()
      Db.oracleEndpoint = {
        update: updateStub
      }
    })

    it('destroys the oracleEndpoint by Id', async () => {
      // Arrange
      updateStub.resolves(true)

      // Act
      const result = await oracleEndpoint.destroyOracleEndpointById('1')

      // Assert
      expect(updateStub.calledOnce).toBe(true)
      expect(result).toBe(true)
    })

    it('fails to destroy the oracleEndpoint', async () => {
      // Arrange
      updateStub.throws(new Error('failed to set active oracle endpoint'))

      // Act
      const action = async () => oracleEndpoint.destroyOracleEndpointById('1')

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })
})
