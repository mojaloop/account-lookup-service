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
 - Steven Oderayi <steven.oderayi@modusbox.com>

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const { createProxyCache, STORAGE_TYPES } = require('@mojaloop/inter-scheme-proxy-cache-lib')
const { Enum, Util } = require('@mojaloop/central-services-shared')
const Logger = require('@mojaloop/central-services-logger')

const Config = require('../../../../src/lib/config')
const Db = require('../../../../src/lib/db')
const partiesDomain = require('../../../../src/domain/parties/parties')
const partiesUtils = require('../../../../src/domain/parties/utils')
const participant = require('../../../../src/models/participantEndpoint/facade')
const oracle = require('../../../../src/models/oracle/facade')
const libUtil = require('../../../../src/lib/util')
const { ERROR_MESSAGES } = require('../../../../src/constants')

const Helper = require('../../../util/helper')
const fixtures = require('../../../fixtures')

const { encodePayload } = Util.StreamingProtocol

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let sandbox

describe('Parties Tests', () => {
  beforeEach(async () => {
    await Util.Endpoints.initializeCache(Config.CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG, libUtil.hubNameConfig)
    sandbox = Sinon.createSandbox()
    sandbox.stub(Util.Request)
    sandbox.stub(Util.Http, 'SwitchDefaultHeaders').returns(Helper.defaultSwitchHeaders)
    sandbox.stub(Util.proxies)

    Db.oracleEndpoint = {
      query: sandbox.stub()
    }
    Db.from = (table) => {
      return Db[table]
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('getPartiesByTypeAndID', () => {
    let proxyCache

    beforeEach(async () => {
      sandbox.stub(participant)
      proxyCache = createProxyCache(STORAGE_TYPES.redis, Config.proxyCacheConfig)
      await proxyCache.connect()
    })

    afterEach(async () => {
      await proxyCache.disconnect()
      sandbox.restore()
    })

    it('handles error case where destination header is missing', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().returns({})
      sandbox.stub(oracle, 'oracleRequest').returns({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().resolves()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const expectedHeaders = {
        ...headers,
        'fspiop-source': 'payerfsp',
        'fspiop-destination': 'fsp1'
      }

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, Helper.mockSpan())

      // Assert
      const lastCallHeaderArgs = participant.sendRequest.getCall(0).args
      expect(participant.sendRequest.callCount).toBe(1)
      expect(lastCallHeaderArgs[0]).toStrictEqual(expectedHeaders)
      expect(lastCallHeaderArgs[1]).toBe('fsp1')
    })

    it('forwards request to destination if specified in headers without consulting any oracles', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().returns({})
      sandbox.stub(oracle, 'oracleRequest')
      participant.sendRequest = sandbox.stub().resolves()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp',
        'fspiop-destination': 'destfsp'
      }

      const expectedHeaders = {
        ...headers,
        'fspiop-source': 'payerfsp',
        'fspiop-destination': 'destfsp'
      }

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, Helper.mockSpan())

      // Assert
      const lastCallHeaderArgs = participant.sendRequest.getCall(0).args
      expect(participant.sendRequest.callCount).toBe(1)
      expect(oracle.oracleRequest.callCount).toBe(0)
      expect(lastCallHeaderArgs[0]).toStrictEqual(expectedHeaders)
      expect(lastCallHeaderArgs[1]).toBe('destfsp')
    })

    it('should send error callback if destination is not in the scheme, and not in proxyCache', async () => {
      participant.validateParticipant = sandbox.stub()
        .onFirstCall().resolves({}) // source
        .onSecondCall().resolves(null) // destination
      participant.sendRequest = sandbox.stub().resolves()
      participant.sendErrorToParticipant = sandbox.stub().resolves()
      sandbox.stub(oracle, 'oracleRequest')
      const headers = fixtures.partiesCallHeadersDto()

      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, Helper.mockSpan(), null, proxyCache)

      expect(participant.sendRequest.callCount).toBe(0)
      expect(oracle.oracleRequest.callCount).toBe(0)
      expect(participant.sendErrorToParticipant.callCount).toBe(1)

      const { errorInformation } = participant.sendErrorToParticipant.getCall(0).args[2]
      expect(errorInformation.errorCode).toBe('3200')
      expect(errorInformation.errorDescription).toContain(ERROR_MESSAGES.partyDestinationFspNotFound)
    })

    it('should send request to proxy, if destination is not in the scheme, but has proxyMapping', async () => {
      participant.validateParticipant = sandbox.stub()
        .onFirstCall().resolves({}) // source
        .onSecondCall().resolves(null) // destination
      participant.sendRequest = sandbox.stub().resolves()
      participant.sendErrorToParticipant = sandbox.stub().resolves()

      const destination = `destination-${Date.now()}`
      const proxyId = `proxy-${Date.now()}`
      await proxyCache.addDfspIdToProxyMapping(destination, proxyId)
      const headers = fixtures.partiesCallHeadersDto({ destination })

      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, Helper.mockSpan(), null, proxyCache)

      expect(participant.sendErrorToParticipant.callCount).toBe(0)
      expect(participant.sendRequest.callCount).toBe(1)

      const [proxyHeaders, proxyDestination] = participant.sendRequest.getCall(0).args
      expect(proxyHeaders).toEqual(headers)
      expect(proxyDestination).toEqual(proxyId)
    })

    it('handles error when sourceDfsp cannot be found (no fspiop-proxy in headers)', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub().resolves(null)
      const loggerStub = sandbox.stub(Logger, 'error')

      // Act
      await partiesDomain.getPartiesByTypeAndID(Helper.getByTypeIdRequest.headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query)

      // Assert
      /*
        The function catches all exceptions. The only way to inspect what happens
        in the error cases is by mocking out the logger and ensuring it gets
        called correctly
      */
      const firstCallArgs = loggerStub.getCall(0).args
      const secondCallArgs = loggerStub.getCall(1).args
      expect(firstCallArgs[0]).toBe(ERROR_MESSAGES.partySourceFspNotFound)
      expect(secondCallArgs[0].name).toBe('FSPIOPError')
    })

    it('should send error callback, if proxy-header is present, but no proxy in the scheme', async () => {
      participant.validateParticipant = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub().resolves()
      participant.sendRequest = sandbox.stub().resolves()
      const proxy = `proxy-${Date.now()}`
      const headers = fixtures.partiesCallHeadersDto({ proxy })

      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, null, null, proxyCache)

      expect(participant.sendRequest.callCount).toBe(0)
      expect(participant.sendErrorToParticipant.callCount).toBe(1)

      const { errorInformation } = participant.sendErrorToParticipant.getCall(0).args[2]
      expect(errorInformation.errorCode).toBe('3200')
      expect(errorInformation.errorDescription).toContain(ERROR_MESSAGES.partyProxyNotFound)
    })

    it('handles error when `participant.validateParticipant()`cannot be found and `sendErrorToParticipant()` fails', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().returns({})
      sandbox.stub(oracle, 'oracleRequest').returns({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().throws(new Error('Error sending request'))
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending Error'))
      const loggerStub = sandbox.stub(Logger, 'error')

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp',
        // Also test the empty DESTINATION header case
        'fspiop-destination': null
      }

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query)

      // Assert
      /*
        The function catches all exceptions. The only way to inspect what happens
        in the error cases is by mocking out the logger and ensuring it gets
        called correctly
      */
      const firstCallArgs = loggerStub.getCall(0).args
      const secondCallArgs = loggerStub.getCall(1).args
      expect(firstCallArgs[0].name).toBe('Error')
      expect(secondCallArgs[0].name).toBe('Error')
      expect(loggerStub.callCount).toBe(2)
    })

    it('handles error when SubId is supplied but `participant.validateParticipant()`cannot be found and `sendErrorToParticipant()` fails', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().returns({})
      sandbox.stub(oracle, 'oracleRequest').returns({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().throws(new Error('Error sending request'))
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending Error'))
      sandbox.stub(Logger)

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const params = { ...Helper.getByTypeIdRequest.params, SubId: 'subId' }
      const expectedErrorCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, Helper.mockSpan())

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEnpointType)
    })

    it('ensures sendRequest is called with the right endpoint type when no SubId is supplied', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().returns({})
      sandbox.stub(oracle, 'oracleRequest').returns({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().resolves()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const params = { ...Helper.getByTypeIdRequest.params }
      const expectedCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query)

      // Assert
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(participant.sendRequest.callCount).toBe(1)
      expect(firstCallArgs[2]).toBe(expectedCallbackEnpointType)
    })

    it('ensures sendRequest is called with the right endpoint type when SubId is supplied', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().returns({})
      sandbox.stub(oracle, 'oracleRequest').returns({
        data: {
          partyList: [
            {
              fspId: 'fsp1',
              partySubIdOrType: 'subId'
            }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().resolves()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const params = { ...Helper.getByTypeIdRequest.params, SubId: 'subId' }
      const expectedCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query)

      // Assert
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(participant.sendRequest.callCount).toBe(1)
      expect(firstCallArgs[2]).toBe(expectedCallbackEnpointType)
    })

    it('ensures sendErrorToParticipant is called with the right endpoint type when SubId is supplied is not matched', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().returns({})
      sandbox.stub(oracle, 'oracleRequest').returns({
        data: {
          partyList: [
            {
              fspId: 'fsp1',
              partySubIdOrType: 'subId'
            }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().resolves()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending Error'))

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const params = { ...Helper.getByTypeIdRequest.params, SubId: 'subIdNOTFOUND' }
      const expectedErrorCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEnpointType)
    })

    it('ensures sendRequest is called only once in FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET mode when oracle returns two records without SubId and with SubId', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().returns({})
      sandbox.stub(oracle, 'oracleRequest').returns({
        data: {
          partyList: [
            {
              fspId: 'fsp1'
            },
            {
              fspId: 'fsp1',
              partySubIdOrType: 'subId'
            }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().resolves()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const params = { ...Helper.getByTypeIdRequest.params, SubId: 'subId' }
      const expectedCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query)

      // Assert
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(participant.sendRequest.callCount).toBe(1)
      expect(firstCallArgs[2]).toBe(expectedCallbackEnpointType)
    })

    it('should send request to proxy if oracle returns dfsp NOT from the scheme', async () => {
      const proxyName = `proxy-${Date.now()}`
      const fspId = `dfspNotFromScheme-${Date.now()}`
      const oracleResponse = fixtures.oracleRequestResponseDto({
        partyList: [{ fspId }]
      })
      sandbox.stub(oracle, 'oracleRequest').resolves(oracleResponse)
      participant.validateParticipant = sandbox.stub()
        .onFirstCall().resolves({}) // source
        .onSecondCall().resolves(null) // oracle dfsp
      participant.sendRequest = sandbox.stub().resolves()
      participant.sendErrorToParticipant = sandbox.stub().resolves()

      const isAdded = await proxyCache.addDfspIdToProxyMapping(fspId, proxyName)
      expect(isAdded).toBe(true)

      const headers = fixtures.partiesCallHeadersDto({ destination: '' })
      const { params, method, query } = Helper.getByTypeIdRequest

      await partiesDomain.getPartiesByTypeAndID(headers, params, method, query, null, null, proxyCache)

      expect(participant.sendErrorToParticipant.callCount).toBe(0)
      expect(participant.sendRequest.callCount).toBe(1)
      const calledProxy = participant.sendRequest.getCall(0).args[1]
      expect(calledProxy).toBe(proxyName)
    })

    it('handles error when `oracleRequest` returns no result', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub().resolves(null)
      oracle.oracleRequest = sandbox.stub().resolves(null)
      sandbox.stub(Logger)
      const expectedErrorCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR

      // Act
      const headers = { ...Helper.getByTypeIdRequest.headers }
      delete headers['fspiop-destination']

      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, Helper.mockSpan())

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEnpointType)
    })

    it('should perform sendToProxies alsRequest, if no destination-header and no data in oracle response', async () => {
      const proxyNames = ['proxyA', 'proxyB']
      Util.proxies.getAllProxiesNames = sandbox.stub().resolves(proxyNames)
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendRequest = sandbox.stub().resolves()
      participant.sendErrorToParticipant = sandbox.stub().resolves()

      const source = `fromDfsp-${Date.now()}`
      const destination = ''
      const headers = fixtures.partiesCallHeadersDto({ source, destination })
      const alsReq = partiesUtils.alsRequestDto(source, Helper.getByTypeIdRequest.params)

      let isExists = await proxyCache.receivedSuccessResponse(alsReq) // no in cache
      expect(isExists).toBe(false)

      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, Helper.mockSpan(), null, proxyCache)

      isExists = await proxyCache.receivedSuccessResponse(alsReq)
      expect(isExists).toBe(true)
      expect(participant.sendErrorToParticipant.callCount).toBe(0)
      expect(participant.sendRequest.callCount).toBe(proxyNames.length)
      const calledProxies = participant.sendRequest.args.map(args => args[1])
      expect(calledProxies).toEqual(proxyNames)
    })

    it('should send error callback, if no successful sendToProxiesList requests', async () => {
      const proxyNames = ['proxyA', 'proxyB']
      Util.proxies.getAllProxiesNames = sandbox.stub().resolves(proxyNames)
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendRequest = sandbox.stub().rejects(new Error('Some network issue'))
      participant.sendErrorToParticipant = sandbox.stub().resolves()
      const headers = fixtures.partiesCallHeadersDto({ destination: '' })

      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query, Helper.mockSpan(), null, proxyCache)

      expect(participant.sendRequest.callCount).toBe(proxyNames.length)
      expect(participant.sendErrorToParticipant.callCount).toBe(1)

      const { errorInformation } = participant.sendErrorToParticipant.getCall(0).args[2]
      expect(errorInformation.errorCode).toBe('3200')
      expect(errorInformation.errorDescription).toContain(ERROR_MESSAGES.proxyConnectionError)
    })
  })

  describe('putPartiesByTypeAndID', () => {
    beforeEach(() => {
      sandbox.stub(participant)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('successfully sends the callback to the participant', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({
        name: 'fsp1'
      })
      participant.sendRequest = sandbox.stub().resolves()
      const payload = JSON.stringify({ testPayload: true })
      const dataUri = encodePayload(payload, 'application/json')

      // Act
      await partiesDomain.putPartiesByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, 'put', payload, dataUri)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const sendRequestCallArgs = participant.sendRequest.getCall(0).args
      expect(sendRequestCallArgs[1]).toStrictEqual('fsp1')
      participant.sendRequest.reset()
    })

    it('successfully sends the callback to the participant when SubId is supplied', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({
        data: {
          name: 'fsp1'
        }
      })
      participant.sendRequest = sandbox.stub().resolves()
      const payload = {}
      const params = { ...Helper.putByTypeIdRequest.params, SubId: 'subId' }
      const expectedCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT

      // Act
      await partiesDomain.putPartiesByTypeAndID(Helper.putByTypeIdRequest.headers, params, 'put', payload, null)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const sendRequestCallArgs = participant.sendRequest.getCall(0).args
      expect(sendRequestCallArgs[2]).toBe(expectedCallbackEnpointType)
    })

    it('handles error when `participant.validateParticipant()` returns no participant', async () => {
      expect.hasAssertions()
      // Arrange
      const loggerStub = sandbox.stub(Logger, 'error')
      participant.sendErrorToParticipant = sandbox.stub().resolves()

      const payload = JSON.stringify({ testPayload: true })
      const dataUri = encodePayload(payload, 'application/json')

      // Act
      await partiesDomain.putPartiesByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, 'put', payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstLoggerCallArgs = loggerStub.getCall(0).args
      expect(firstLoggerCallArgs[0]).toStrictEqual('Requester FSP not found')
      loggerStub.reset()
      participant.sendErrorToParticipant.reset()
    })

    it('handles error when SubId is supplied but `participant.validateParticipant()` returns no participant', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      participant.sendErrorToParticipant = sandbox.stub().resolves()
      participant.validateParticipant = sandbox.stub()
      participant.validateParticipant.withArgs('payerfsp')
        .resolves({
          data: {
            name: 'fsp1'
          }
        })
      participant.validateParticipant.withArgs('payeefsp').resolves(null)

      const payload = JSON.stringify({ testPayload: true })
      const dataUri = encodePayload(payload, 'application/json')
      const params = { ...Helper.putByTypeIdRequest.params, SubId: 'subId' }
      const expectedErrorCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR

      // Act
      await partiesDomain.putPartiesByTypeAndID(Helper.putByTypeIdRequest.headers, params, 'put', payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEnpointType)
    })

    it('handles error when `participant.validateParticipant()` is found and `sendErrorToParticipant()` fails', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub()
      participant.validateParticipant.withArgs('payerfsp')
        .resolves({
          data: {
            name: 'fsp1'
          }
        })
      participant.validateParticipant.withArgs('payeefsp').resolves(null)
      participant.sendErrorToParticipant = sandbox.stub().throws('Error in sendErrorToParticipant')

      const payload = JSON.stringify({ testPayload: true })
      const dataUri = encodePayload(payload, 'application/json')

      // Act
      await partiesDomain.putPartiesByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, 'put', payload, dataUri)

      // Assert
      expect(participant.validateParticipant.callCount).toBe(2)
      expect(participant.sendErrorToParticipant.callCount).toBe(2)
      participant.validateParticipant.reset()
      participant.sendErrorToParticipant.reset()
    })

    it('handles error when SubId is supplied, `participant.validateParticipant()` is found but `sendErrorToParticipant()` fails', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      participant.validateParticipant = sandbox.stub()
      participant.validateParticipant.withArgs('payerfsp')
        .resolves({
          data: {
            name: 'fsp1'
          }
        })
      participant.validateParticipant.withArgs('payeefsp').resolves(null)
      participant.sendErrorToParticipant = sandbox.stub().throws('Error in sendErrorToParticipant')

      const payload = JSON.stringify({ testPayload: true })
      const dataUri = encodePayload(payload, 'application/json')
      const params = { ...Helper.putByTypeIdRequest.params, SubId: 'subId' }
      const expectedErrorCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR

      // Act
      await partiesDomain.putPartiesByTypeAndID(Helper.putByTypeIdRequest.headers, params, 'put', payload, dataUri)

      // Assert
      expect(participant.validateParticipant.callCount).toBe(2)
      expect(participant.sendErrorToParticipant.callCount).toBe(2)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEnpointType)
    })
  })

  describe('putPartiesErrorByTypeAndID', () => {
    beforeEach(() => {
      sandbox.stub(participant)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('successfully sends error to the participant', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({
        data: {
          name: 'fsp1'
        }
      })
      participant.sendErrorToParticipant = sandbox.stub().resolves()
      const payload = JSON.stringify({ errorPayload: true })
      const dataUri = encodePayload(payload, 'application/json')

      // Act
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, payload, dataUri, Helper.mockSpan())

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[0]).toStrictEqual('payeefsp')
    })

    it('succesfully sends error to the participant when SubId is supplied', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({
        data: {
          name: 'fsp1'
        }
      })
      participant.sendErrorToParticipant = sandbox.stub().resolves()
      const payload = JSON.stringify({ errorPayload: true })
      const dataUri = encodePayload(payload, 'application/json')
      const params = { ...Helper.putByTypeIdRequest.params, SubId: 'subId' }
      const expectedCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR

      // Act
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, params, payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[0]).toStrictEqual('payeefsp')
      expect(sendErrorCallArgs[1]).toBe(expectedCallbackEnpointType)
    })

    it('sends error to the participant when there is no destination participant', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Unknown error'))
      const payload = JSON.stringify({ errorPayload: true })
      const dataUri = encodePayload(payload, 'application/json')

      // Act
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(2)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[0]).toStrictEqual('payerfsp')
    })

    it('handles error when `decodePayload()` fails', async () => {
      expect.hasAssertions()
      // Arrange)
      participant.validateParticipant = sandbox.stub().resolves({
        data: {
          name: 'fsp1'
        }
      })
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Unknown error'))
      const payload = JSON.stringify({ errorPayload: true })
      // Send a data uri that will cause `decodePayload` to throw
      const invalidDataUri = () => 'invalid uri'

      // Act
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, payload, invalidDataUri, Helper.mockSpan())

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[0]).toStrictEqual('payerfsp')
    })

    it('handles error when `validateParticipant()` fails', async () => {
      expect.hasAssertions()
      // Arrange)
      const loggerStub = sandbox.stub(Logger, 'error')
      participant.validateParticipant = sandbox.stub().throws(new Error('Validation fails'))
      participant.sendErrorToParticipant = sandbox.stub().resolves({})
      const payload = JSON.stringify({ errorPayload: true })
      const expectedCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR

      // Act
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, payload)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      expect(loggerStub.callCount).toBe(1)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[1]).toBe(expectedCallbackEnpointType)
    })

    it('handles error when SubID is supplied but `validateParticipant()` fails', async () => {
      expect.hasAssertions()
      // Arrange)
      const loggerStub = sandbox.stub(Logger, 'error')
      participant.validateParticipant = sandbox.stub().throws(new Error('Validation fails'))
      participant.sendErrorToParticipant = sandbox.stub().resolves({})
      const payload = JSON.stringify({ errorPayload: true })
      const params = { ...Helper.putByTypeIdRequest.params, SubId: 'SubId' }
      const expectedCallbackEnpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR

      // Act
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, params, payload)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      expect(loggerStub.callCount).toBe(1)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[1]).toBe(expectedCallbackEnpointType)
    })
  })
})
