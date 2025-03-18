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

'use strict'

const Sinon = require('sinon')
const oracleDomain = require('../../../../src/domain/oracle/oracle')
const oracleEndpoint = require('../../../../src/models/oracle')
const currency = require('../../../../src/models/currency')
const partyIdType = require('../../../../src/models/partyIdType')
const Db = require('../../../../src/lib/db')
const oracleEndpointCached = require('../../../../src/models/oracle/oracleEndpointCached')
const Logger = require('@mojaloop/central-services-logger')
const Metrics = require('@mojaloop/central-services-metrics')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)

const partyIdTypeResponse = {
  partyIdTypeId: 1,
  name: 'MSISDN',
  description: 'A MSISDN (Mobile Station International Subscriber Directory Number, that is, the phone number)',
  isActive: 1,
  createdDate: '2019-05-24 08:52:19'
}

const partyIdTypeResponseIBAN = {
  partyIdTypeId: 2,
  name: 'IBAN',
  description: 'An IBAN',
  isActive: 1,
  createdDate: '2019-05-24 08:52:19'
}

const endpointTypeResponse = {
  endpointTypeId: 1,
  type: 'URL',
  description: 'REST URLs',
  isActive: 1,
  createdDate: '2019-05-24 08:52:19'
}

const getOracleDatabaseResponse = [{
  oracleEndpointId: 1,
  endpointType: 'URL',
  value: 'http://localhost:8444',
  idType: 'MSISDN',
  currency: 'USD',
  isDefault: 1,
  isActive: 1
}]

const getAllOracleEndpointsByMatchConditionResponse = [{
  oracleEndpointId: 1,
  endpointType: 'URL',
  value: 'http://localhost:8444',
  idType: 'MSISDN',
  currency: 'EUR',
  isDefault: 1,
  isActive: 1
}]

let sandbox
let SpanStub

describe('Oracle tests', () => {
  // Initialize Metrics for testing
  Metrics.getCounter(
    'errorCount',
    'Error count',
    ['code', 'system', 'operation', 'step', 'context', 'expected']
  )

  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    Db.partyIdType = {
      findOne: sandbox.stub()
    }
    Db.endpointType = {
      findOne: sandbox.stub()
    }
    Db.oracleEndpoint = {
      update: sandbox.stub(),
      insert: sandbox.stub(),
      query: sandbox.stub()
    }
    Db.from = (table) => {
      return Db[table]
    }
    Db.partyIdType.findOne.returns(partyIdTypeResponse)
    Db.endpointType.findOne.returns(endpointTypeResponse)
    Db.oracleEndpoint.insert.returns(true)
    Db.oracleEndpoint.query.returns(getOracleDatabaseResponse)
    Db.oracleEndpoint.update.returns(true)

    sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleDatabaseResponse)
    sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns(getOracleDatabaseResponse)
    sandbox.stub(oracleEndpointCached, 'getOracleEndpointByCurrency').returns(getOracleDatabaseResponse)

    SpanStub = {
      audit: sandbox.stub().callsFake(),
      error: sandbox.stub().callsFake(),
      finish: sandbox.stub().callsFake(),
      debug: sandbox.stub().callsFake(),
      info: sandbox.stub().callsFake(),
      getChild: sandbox.stub().returns(SpanStub),
      setTags: sandbox.stub().callsFake()
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('deleteOracle', () => {
    it('should delete an oracle given an ID', async () => {
      // Arrange
      // Act
      const response = await oracleDomain.deleteOracle({ ID: '12345' })

      // Assert
      expect(response).toBe(true)
    })

    it('should fail if params is undefined', async () => {
      // Arrange
      // Act
      const action = async () => oracleDomain.deleteOracle(undefined)

      // Assert
      await expect(action()).rejects.toThrowError('Cannot read properties of undefined (reading \'ID\')')
    })
  })

  describe('updateOracle', () => {
    it('should update the oracle', async () => {
      // Arrange
      oracleEndpoint.getOracleEndpointById = sandbox.stub().resolves(getOracleDatabaseResponse)
      partyIdType.getPartyIdTypeByName = sandbox.stub().resolves(partyIdTypeResponseIBAN)
      oracleEndpoint.getAllOracleEndpointsByMatchCondition = sandbox.stub().resolves([])
      currency.getCurrencyById = sandbox.stub().resolves({
        currencyId: 'AUD',
        name: 'Australian Dollars',
        isActive: true,
        createdDate: (new Date()).toISOString()
      })
      oracleEndpoint.updateOracleEndpointById = sandbox.stub()
      const params = { ID: '12345' }
      const payload = {
        oracleIdType: 'IBAN',
        isDefault: 1,
        currency: 'AUD',
        endpoint: {
          endpointType: 'CUSTOM_TYPE',
          value: 'http://custom_url:8444'
        }
      }
      const expected = {
        currencyId: 'AUD',
        endpointTypeId: 1,
        partyIdTypeId: 2,
        value: 'http://custom_url:8444'
      }

      // Act
      await oracleDomain.updateOracle(params, payload)

      // Assert
      const firstCallArgs = oracleEndpoint.updateOracleEndpointById.getCall(0).args
      expect(firstCallArgs[0]).toBe('12345')
      expect(firstCallArgs[1]).toEqual(expected)
    })

    it('rejects updating an oracle if it is similar to existing active oracle', async () => {
      // Arrange
      oracleEndpoint.getOracleEndpointById = sandbox.stub().resolves(getOracleDatabaseResponse)
      partyIdType.getPartyIdTypeByName = sandbox.stub().resolves(partyIdTypeResponseIBAN)
      oracleEndpoint.getAllOracleEndpointsByMatchCondition = sandbox.stub().resolves(getAllOracleEndpointsByMatchConditionResponse)
      currency.getCurrencyById = sandbox.stub().resolves({
        currencyId: 'EUR',
        name: 'European Dollars',
        isActive: true,
        createdDate: (new Date()).toISOString()
      })
      oracleEndpoint.updateOracleEndpointById = sandbox.stub()
      const params = { ID: '12345' }
      const payload = {
        oracleIdType: 'MSISDN',
        isDefault: 1,
        currency: 'EUR',
        endpoint: {
          endpointType: 'URL',
          value: 'http://custom_url:8444'
        }
      }

      // Act
      try {
        await oracleDomain.updateOracle(params, payload)
      } catch (err) {
        expect(err.message).toEqual('Active oracle with matching partyIdTypeId, endpointTypeId, currencyId already exists')
      }
    })

    it('handles error when oracleEndpointList is empty', async () => {
      // Arrange
      oracleEndpoint.getOracleEndpointById = sandbox.stub().resolves([])
      const params = { ID: '12345' }
      const payload = {}

      // Act
      const action = async () => oracleDomain.updateOracle(params, payload)

      // Assert
      await expect(action()).rejects.toThrowError(/Oracle not found/)
    })

    it('handles error when `getCurrencyById` returns empty result', async () => {
      // Arrange
      oracleEndpoint.getOracleEndpointById = sandbox.stub().resolves(getOracleDatabaseResponse)
      partyIdType.getPartyIdTypeByName = sandbox.stub().resolves(partyIdTypeResponseIBAN)
      currency.getCurrencyById = sandbox.stub().resolves(null)
      const params = { ID: '12345' }
      const payload = {
        oracleIdType: 'IBAN',
        isDefault: 1,
        currency: 'AUD',
        endpoint: {
          endpointType: 'CUSTOM_TYPE',
          value: 'http://custom_url:8444'
        }
      }

      // Act
      const action = async () => oracleDomain.updateOracle(params, payload)

      // Assert
      await expect(action()).rejects.toThrowError()
    })
  })

  describe('createOracle', () => {
    it('should create an oracle when isDefault is true', async () => {
      oracleEndpoint.getAllOracleEndpointsByMatchCondition = sandbox.stub().resolves([])
      // Arrange
      const createPayload = {
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: 1
      }
      const createHeaders = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'cache-control': 'no-cache',
        date: '',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        'user-agent': 'PostmanRuntime/7.17.1',
        'postman-token': 'fc2ac209-de3e-4851-b6ba-02efde9060fa',
        host: '127.0.0.1:4003',
        'accept-encoding': 'gzip, deflate',
        'content-length': 164,
        connection: 'keep-alive'
      }

      // Update mock to be deleted so it passes check
      getOracleDatabaseResponse[0].isActive = false

      // Act
      const response = await oracleDomain.createOracle(createPayload, createHeaders, SpanStub)

      // Assert
      expect(response).toBe(true)
    })

    it('should create an oracle isDefault false', async () => {
      oracleEndpoint.getAllOracleEndpointsByMatchCondition = sandbox.stub().resolves([])
      // Arrange
      const createPayload = {
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        }
      }
      const createHeaders = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'cache-control': 'no-cache',
        date: '',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        'user-agent': 'PostmanRuntime/7.17.1',
        'postman-token': 'fc2ac209-de3e-4851-b6ba-02efde9060fa',
        host: '127.0.0.1:4003',
        'accept-encoding': 'gzip, deflate',
        'content-length': 164,
        connection: 'keep-alive'
      }

      // Update mock to be deleted so it passes check
      getOracleDatabaseResponse[0].isActive = false

      // Act
      const response = await oracleDomain.createOracle(createPayload, createHeaders, SpanStub)

      // Assert
      expect(response).toBe(true)
    })

    it('should fail if partyIdType throws', async () => {
      // Arrange
      partyIdType.getPartyIdTypeByName = sandbox.stub().throws(new Error('Cannot get partyIdType'))
      const createPayload = {
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        currency: 'AUD'
      }

      // Act
      const action = async () => oracleDomain.createOracle(createPayload)

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })

  describe('getOracle', () => {
    it('should get the details of the requested oracle without currency and type', async () => {
      // Arrange
      const query = {}
      const createHeaders = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'cache-control': 'no-cache',
        date: '',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        'user-agent': 'PostmanRuntime/7.17.1',
        'postman-token': 'fc2ac209-de3e-4851-b6ba-02efde9060fa',
        host: '127.0.0.1:4003',
        'accept-encoding': 'gzip, deflate',
        connection: 'keep-alive'
      }
      const expected = [{
        oracleId: 1,
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        currency: 'USD',
        isDefault: 1
      }]

      // Act
      const response = await oracleDomain.getOracle(query, createHeaders, SpanStub)

      // Assert
      expect(response).toEqual(expected)
    })

    it('should get the details of the requested oracle with currency', async () => {
      // Arrange
      const query = {
        currency: 'USD'
      }
      const createHeaders = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'cache-control': 'no-cache',
        date: '',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        'user-agent': 'PostmanRuntime/7.17.1',
        'postman-token': 'fc2ac209-de3e-4851-b6ba-02efde9060fa',
        host: '127.0.0.1:4003',
        'accept-encoding': 'gzip, deflate',
        connection: 'keep-alive'
      }
      const expected = [{
        oracleId: 1,
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        currency: 'USD',
        isDefault: 1
      }]

      // Act
      const response = await oracleDomain.getOracle(query, createHeaders, SpanStub)

      // Assert
      expect(response).toEqual(expected)
    })

    it('should get the details of the requested oracle with type', async () => {
      // Arrange
      const query = {
        type: 'MSISDN'
      }
      const createHeaders = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'cache-control': 'no-cache',
        date: '',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        'user-agent': 'PostmanRuntime/7.17.1',
        'postman-token': 'fc2ac209-de3e-4851-b6ba-02efde9060fa',
        host: '127.0.0.1:4003',
        'accept-encoding': 'gzip, deflate',
        connection: 'keep-alive'
      }
      const expected = [{
        oracleId: 1,
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        currency: 'USD',
        isDefault: 1
      }]

      // Act
      const response = await oracleDomain.getOracle(query, createHeaders, SpanStub)

      // Assert
      expect(response).toEqual(expected)
    })

    it('should get the details of the requested oracle with currency and type', async () => {
      // Arrange
      const query = {
        currency: 'USD',
        type: 'MSISDN'
      }
      const createHeaders = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'cache-control': 'no-cache',
        date: '',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        'user-agent': 'PostmanRuntime/7.17.1',
        'postman-token': 'fc2ac209-de3e-4851-b6ba-02efde9060fa',
        host: '127.0.0.1:4003',
        'accept-encoding': 'gzip, deflate',
        connection: 'keep-alive'
      }
      const expected = [{
        oracleId: 1,
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        currency: 'USD',
        isDefault: 1
      }]

      // Act
      const response = await oracleDomain.getOracle(query, createHeaders, SpanStub)

      // Assert
      expect(response).toEqual(expected)
    })

    it('should throw on database query error', async () => {
      // Arrange
      sandbox.restore()
      Db.oracleEndpoint = {
        query: sandbox.stub(),
        insert: sandbox.stub()
      }
      Db.oracleEndpoint.insert.returns(true)
      Db.oracleEndpoint.query.throws(new Error())
      const request = {
        query: {}
      }

      // Act
      const action = async () => oracleDomain.getOracle(request)

      // Assert
      await expect(action()).rejects.toThrow()
    })
  })
})
