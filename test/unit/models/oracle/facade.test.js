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
const Enums = require('@mojaloop/central-services-shared').Enum
const request = require('@mojaloop/central-services-shared').Util.Request

const OracleFacade = require('../../../../src/models/oracle/facade')
const oracleEndpoint = require('../../../../src/models/oracle')

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
      sandbox.stub(oracleEndpoint, 'getOracleEndpointByTypeAndCurrency').resolves(getOracleResponse)
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
      sandbox.stub(oracleEndpoint, 'getOracleEndpointByTypeAndCurrency').resolves(getOracleResponse)
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

    it('fails to send request when type + currency cannot be found', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)

      const getOracleResponse = []
      sandbox.stub(oracleEndpoint, 'getOracleEndpointByTypeAndCurrency').resolves(getOracleResponse)
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
      sandbox.stub(oracleEndpoint, 'getOracleEndpointByType').resolves(getOracleResponse)
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

      sandbox.stub(oracleEndpoint, 'getOracleEndpointByType').resolves(getOracleResponse)
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
      sandbox.stub(oracleEndpoint, 'getOracleEndpointByType').resolves(getOracleResponse)
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
      await expect(action()).rejects.toThrowError(new RegExp('(Oracle type:.*not found)'))
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

      sandbox.stub(oracleEndpoint, 'getOracleEndpointByType').resolves(getOracleResponse)
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

      sandbox.stub(oracleEndpoint, 'getOracleEndpointByTypeAndCurrency').resolves(getOracleResponse)
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
      sandbox.stub(oracleEndpoint, 'getOracleEndpointByTypeAndCurrency').resolves(getOracleResponse)
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
      await expect(action()).rejects.toThrow(new RegExp('Oracle type:.* not found'))
    })
  })
})
