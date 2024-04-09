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
 - Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

'use strict'

const axios = require('axios')
const Sinon = require('sinon')
const Enums = require('@mojaloop/central-services-shared').Enum
const request = require('@mojaloop/central-services-shared').Util.Request
const Logger = require('@mojaloop/central-services-logger')
const { Factory } = require('@mojaloop/central-services-error-handling')

const OracleFacade = require('../../../../src/models/oracle/facade')
const oracleEndpointCached = require('../../../../src/models/oracle/oracleEndpointCached')

jest.mock('axios')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
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

    it('should proxy error message when oracle request fails', async () => {
      sandbox.restore()
      const { AxiosError } = jest.requireActual('axios')// to restore request.sendRequest and use mocked axios
      const status = 400
      const code = (status >= 500)
        ? AxiosError.ERR_BAD_RESPONSE
        : AxiosError.ERR_BAD_REQUEST
      const errResponse = {
        status,
        data: {
          errorCode: '2001',
          errorDescription: 'Test server error'
        }
      }
      const error = new AxiosError('Test Error', code, null, null, errResponse)
      axios.mockImplementation(() => Promise.reject(error))

      sandbox.stub(oracleEndpointCached, 'getOracleEndpointByType').returns([{}])

      const fspId = 'fsp01'
      const payload = { fspId }
      const headers = { [Enums.Http.Headers.FSPIOP.SOURCE]: fspId }
      const method = Enums.Http.RestMethods.POST
      const params = { Type: 'MSISDN', ID: '27713803912' }

      try {
        await OracleFacade.oracleRequest(headers, method, params, {}, payload)
        throw new Error('Not reachable code')
      } catch (err) {
        expect(err).toBeInstanceOf(Factory.FSPIOPError)
        expect(err.httpStatusCode).toBe(status)
        // expect(err.apiErrorCode).toEqual(expect.objectContaining({
        //   code: '3204',
        //   message: 'Party not found',
        //   name: 'PARTY_NOT_FOUND',
        //   httpStatusCode: status
        // }))
      }
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
