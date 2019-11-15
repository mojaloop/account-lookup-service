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
const oracleDomain = require('../../../../src/domain/oracle/oracle')
const oracleEndpoint = require('../../../../src/models/oracle')
const currency = require('../../../../src/models/currency')
const partyIdType = require('../../../../src/models/partyIdType')
const Db = require('../../../../src/lib/db')

const partyIdTypeResponse = {
  partyIdTypeId: 1,
  name: 'MSISDN',
  description: 'A MSISDN (Mobile Station International Subscriber Directory Number, that is, the phone number)',
  isActive: true,
  createdDate: '2019-05-24 08:52:19'
}

const partyIdTypeResponseIBAN = {
  partyIdTypeId: 2,
  name: 'IBAN',
  description: 'An IBAN',
  isActive: true,
  createdDate: '2019-05-24 08:52:19'
}

const endpointTypeResponse = {
  endpointTypeId: 1,
  type: 'URL',
  description: 'REST URLs',
  isActive: true,
  createdDate: '2019-05-24 08:52:19'
}

const getOracleDatabaseResponse = [{
  oracleEndpointId: 1,
  endpointType: 'URL',
  value: 'http://localhost:8444',
  idType: 'MSISDN',
  currency: 'USD',
  isDefault: true
}]

let sandbox
let SpanStub

describe('Oracle tests', () => {
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
    Db.partyIdType.findOne.returns(partyIdTypeResponse)
    Db.endpointType.findOne.returns(endpointTypeResponse)
    Db.oracleEndpoint.insert.returns(true)
    Db.oracleEndpoint.query.returns(getOracleDatabaseResponse)
    Db.oracleEndpoint.update.returns(true)

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
      await expect(action()).rejects.toThrowError(new RegExp('Cannot read property \'ID\' of undefined'))
    })
  })

  describe('updateOracle', () => {
    it('should update the oracle', async () => {
      // Arrange
      oracleEndpoint.getOracleEndpointById = sandbox.stub().resolves(getOracleDatabaseResponse)
      partyIdType.getPartyIdTypeByName = sandbox.stub().resolves(partyIdTypeResponseIBAN)
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
        isDefault: true,
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

    it('handles error when oracleEndpointList is empty', async () => {
      // Arrange
      oracleEndpoint.getOracleEndpointById = sandbox.stub().resolves([])
      const params = { ID: '12345' }
      const payload = {}

      // Act
      const action = async () => oracleDomain.updateOracle(params, payload)

      // Assert
      await expect(action()).rejects.toThrowError(new RegExp('Oracle not found'))
    })
  })

  describe('createOracle', () => {
    it('should create an oracle when isDefault is true', async () => {
      // Arrange
      const createPayload = {
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      }
      const createHeaders = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'cache-control': 'no-cache',
        date: '',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        'user-agent': 'PostmanRuntime/7.17.1',
        'postman-token': 'fc2ac209-de3e-4851-b6ba-02efde9060fa',
        host: '127.0.0.1:4003',
        'accept-encoding': 'gzip, deflate',
        'content-length': 164,
        connection: 'keep-alive'
      }
      // const createSpan = {
      //   'isFinished': false,
      //   'spanContext': {
      //     'startTimestamp': '2019-11-14T23:33:35.338Z',
      //     'service': 'als_oracles_post',
      //     'traceId': '27e489d05dd7b3f3ec77fdcb103f56f6',
      //     'spanId': '10c68389b25c92ee',
      //     'tags': {}
      //   },
      //   'recorders': {
      //     'defaultRecorder': {
      //       'recorder': {
      //         'grpcClient': {
      //           '$interceptors': [],
      //           '$interceptor_providers': [],
      //           '$channel': {}
      //         }
      //       }
      //     }
      //   }
      // }

      // Act
      const response = await oracleDomain.createOracle(createPayload, createHeaders, SpanStub)

      // Assert
      expect(response).toBe(true)
    })

    it('should create an oracle isDefault false', async () => {
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        'user-agent': 'PostmanRuntime/7.17.1',
        'postman-token': 'fc2ac209-de3e-4851-b6ba-02efde9060fa',
        host: '127.0.0.1:4003',
        'accept-encoding': 'gzip, deflate',
        'content-length': 164,
        connection: 'keep-alive'
      }

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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        isDefault: true
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        isDefault: true
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        isDefault: true
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        isDefault: true
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
