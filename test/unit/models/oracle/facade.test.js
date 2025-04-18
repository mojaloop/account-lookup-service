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
 - Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const Enums = require('@mojaloop/central-services-shared').Enum
const request = require('@mojaloop/central-services-shared').Util.Request
const errorHandling = require('@mojaloop/central-services-error-handling')

const OracleFacade = require('#src/models/oracle/facade')
const oracleEndpointCached = require('#src/models/oracle/oracleEndpointCached')
const fixtures = require('#test/fixtures/index')

const { createFSPIOPError } = errorHandling.Factory
const { FSPIOPErrorCodes } = errorHandling.Enums

let sandbox

describe('Oracle Facade', () => {
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(request)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('oracleRequest', () => {
    it('sends requests to more than 1 oracle', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      },
      {
        oracleId: '2',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8445',
          endpointType: 'URL'
        },
        isDefault: false
      }]
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleResponse)
      const headers = {

      }
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345'
      }
      const payload = { currency: 'AUD' }

      // Act
      await OracleFacade.oracleRequest(headers, method, params, {}, payload)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('sends requests based on a payload currency', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      }]
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345'
      }
      const payload = { currency: 'AUD' }

      // Act
      await OracleFacade.oracleRequest(headers, method, params, {}, payload)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('sends requests based on a payload currency and SubId param', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      }]
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345',
        SubId: '6789'
      }
      const payload = { currency: 'AUD' }

      // Act
      await OracleFacade.oracleRequest(headers, method, params, {}, payload)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('sends requests based on SubId param', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      }]
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.POST
      const params = {
        Type: 'request_type',
        ID: '12345',
        SubId: '6789'
      }
      const payload = { currency: 'AUG' }

      // Act
      await OracleFacade.oracleRequest(headers, method, params, {}, payload)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('sends request to default oracle when multiple oracles are found (SubId branch)', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      },
      {
        oracleId: '2',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8445',
          endpointType: 'URL'
        },
        isDefault: false
      }]
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345',
        SubId: '6789'
      }
      const payload = { currency: '' }

      // Act
      await OracleFacade.oracleRequest(headers, method, params, {}, payload)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('throws error if no oracle is found (SubId branch)', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = []
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345',
        SubId: '6789'
      }
      const payload = { currency: '' }

      // Act / Assert
      await expect(OracleFacade.oracleRequest(headers, method, params, {}, payload)).rejects.toThrow()
    })

    it('sends request to default oracle when multiple oracles are found (Type, Currency, and SubId branch)', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      },
      {
        oracleId: '2',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8445',
          endpointType: 'URL'
        },
        isDefault: false
      }]
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345',
        SubId: '6789'
      }
      const payload = { currency: 'AUD' }

      // Act
      await OracleFacade.oracleRequest(headers, method, params, {}, payload)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('throws error if no oracle is found (Type, Currency and SubId branch)', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = []
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345',
        SubId: '6789'
      }
      const payload = { currency: 'AUD' }

      // Act / Assert
      await expect(OracleFacade.oracleRequest(headers, method, params, {}, payload)).rejects.toThrow()
    })

    it('fails to send request when type + currency cannot be found', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = []
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345'
      }
      const payload = { currency: 'AUD' }

      // Act
      const action = async () => OracleFacade.oracleRequest(headers, method, params, {}, payload)

      // Assert
      await expect(action()).rejects.toThrow()
    })

    it('handles requests when no currency is specified', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      }]
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET

      // Act
      await OracleFacade.oracleRequest(headers, method)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('handles requests whe no currency is specified and more than 1 oracleEndpintModel is found', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      },
      {
        oracleId: '2',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8445',
          endpointType: 'URL'
        },
        isDefault: false
      }]

      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET

      // Act
      await OracleFacade.oracleRequest(headers, method)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('fails to send when currency is not specified, and type cannot be found', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = []
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const params = {
        Type: 'request_type',
        ID: '12345'
      }
      const payload = {}

      // Act
      const action = async () => OracleFacade.oracleRequest(headers, method, params, {}, payload)

      // Assert
      await expect(action()).rejects.toThrowError(/(Oracle type:.*not found)/)
    })

    it('should return proper error on adding existing party [CSI-1352]', async () => {
      expect.hasAssertions()
      const ERROR = FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR
      request.sendRequest = sandbox.stub().rejects(createFSPIOPError(ERROR))
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').resolves([{}])
      const method = Enums.Http.RestMethods.POST
      const headers = fixtures.partiesCallHeadersDto()
      const params = fixtures.partiesParamsDto()

      await OracleFacade.oracleRequest(headers, method, params)
        .catch(err => {
          expect(err.apiErrorCode.code).toBe(ERROR.code)
        })
    })
  })

  describe('oracleBatchRequest', () => {
    it('sends a batch without a currency', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      },
      {
        oracleId: '2',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8445',
          endpointType: 'URL'
        },
        isDefault: false
      }]

      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const requestPayload = {}
      const payload = {}

      // Act
      await OracleFacade.oracleBatchRequest(headers, method, requestPayload, 'URL', payload)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('sends a batch from payload currency', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = [{
        oracleId: '1',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        },
        isDefault: true
      }]

      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const requestPayload = {
        currency: 'AUD'
      }
      const payload = {}

      // Act
      await OracleFacade.oracleBatchRequest(headers, method, requestPayload, 'URL', payload)

      // Assert
      expect(requestStub.calledOnce).toBe(true)
    })

    it('fails when oracle type cannnot be found', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = []
      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByTypeAndCurrency').returns(getOracleResponse)
      const headers = {}
      headers[Enums.Http.Headers.FSPIOP.SOURCE] = 'fsp01'
      headers[Enums.Http.Headers.FSPIOP.DESTINATION] = 'fsp02'
      const method = Enums.Http.RestMethods.GET
      const requestPayload = {
        currency: 'AUD'
      }
      const payload = {}

      // Act
      const action = async () => OracleFacade.oracleBatchRequest(headers, method, requestPayload, 'URL', payload)

      // Assert
      await expect(action()).rejects.toThrow(/Oracle type:.* not found/)
    })
  })
})
