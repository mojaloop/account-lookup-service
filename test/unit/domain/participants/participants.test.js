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
 - Steven Oderayi <steven.oderayi@modusbox>

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const Enums = require('@mojaloop/central-services-shared').Enum
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Metrics = require('@mojaloop/central-services-metrics')

const participantsDomain = require('../../../../src/domain/participants/participants')
const participant = require('../../../../src/models/participantEndpoint/facade')
const oracle = require('../../../../src/models/oracle/facade')
const Config = require('../../../../src/lib/config')
const { logger } = require('../../../../src/lib')
const { ERROR_MESSAGES } = require('../../../../src/constants')
const Helper = require('../../../util/helper')
const fixtures = require('../../../fixtures')

const { Headers } = Enums.Http

describe('participant Tests', () => {
  describe('getParticipantsByTypeAndID', () => {
    let sandbox
    // Initialize Metrics for testing
    Metrics.getCounter(
      'errorCount',
      'Error count',
      ['code', 'system', 'operation', 'step']
    )

    beforeEach(() => {
      sandbox = Sinon.createSandbox()
      sandbox.stub(participant)
      sandbox.stub(oracle)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('gets participants and sends callback', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()
      const args = [
        Helper.getByTypeIdCurrencyRequest.headers,
        Helper.getByTypeIdCurrencyRequest.params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query,
        Helper.mockSpan()
      ]

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('payeefsp')
    })

    it('gets participants and sends callback when SubId is supplied', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()
      const params = { ...Helper.getByTypeIdCurrencyRequest.params, SubId: 'subId' }
      const args = [
        Helper.getByTypeIdCurrencyRequest.headers,
        params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query
      ]
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('payeefsp')
      expect(firstCallArgs[2]).toBe(expectedCallbackEndpointType)
      expect(firstCallArgs[5].partySubIdOrType).toBe('subId')
    })

    it('fails to get participants and sends error callback with appropriate endpoint type when SubId is specified', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendRequest = sandbox.stub()
      const params = { ...Helper.getByTypeIdCurrencyRequest.params, SubId: 'subId' }
      const args = [
        Helper.getByTypeIdCurrencyRequest.headers,
        params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query,
        Helper.mockSpan()
      ]
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendRequest.callCount).toBe(0)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEndpointType)
    })

    it('gets participants and sends callback when `fspiop-dest` is not set', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const args = [
        headers,
        Helper.getByTypeIdCurrencyRequest.params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query,
        Helper.mockSpan()
      ]

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe(headers['fspiop-source'])
    })

    it('fails with `Requester FSP not found` if `validateParticipant` fails', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves(null)
      const logStub = sandbox.stub(logger.constructor.prototype, 'warn')

      participant.sendRequest = sandbox.stub()
      const args = [
        Helper.getByTypeIdCurrencyRequest.headers,
        Helper.getByTypeIdCurrencyRequest.params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query
      ]

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      const firstCallArgs = logStub.getCall(0).args
      expect(firstCallArgs[0]).toBe(ERROR_MESSAGES.sourceFspNotFound)
    })

    it('fails when `oracleRequest` response is empty', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()

      const args = [
        Helper.getByTypeIdCurrencyRequest.headers,
        Helper.getByTypeIdCurrencyRequest.params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query
      ]

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
    })

    it('handles error when `sendRequest` and sendErrorToParticipant` fails', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().throws(new Error('sendRequest error'))
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('sendErrorToParticipant error'))

      const args = [
        Helper.getByTypeIdCurrencyRequest.headers,
        Helper.getByTypeIdCurrencyRequest.params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query
      ]

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
    })

    it('handles error when `sendRequest` and sendErrorToParticipant` fails, but sends callback with a specific endpoint type when SubId is present', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub().throws(new Error('sendRequest error'))
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('sendErrorToParticipant error'))

      const params = { ...Helper.getByTypeIdCurrencyRequest.params, SubId: 'subId' }
      const args = [
        Helper.getByTypeIdCurrencyRequest.headers,
        params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query
      ]
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEndpointType)
    })
  })

  describe('putParticipantsByTypeAndID', () => {
    let sandbox

    beforeEach(() => {
      sandbox = Sinon.createSandbox()
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('sends put request to the participant', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe(Config.HUB_NAME)
    })

    it('sends put request to the participant with SubId', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'subId'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe(Config.HUB_NAME)
      expect(firstCallArgs[2]).toBe(expectedCallbackEndpointType)
      expect(firstCallArgs[4].partyList[0].partySubIdOrType).toBe('subId')
    })

    it('handles put request without fspiop-dest header', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp2' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp2',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('fsp2')
    })

    it('handles the case where `oracleRequest` returns has no response.data', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles the case where SubId is supplied but `oracleRequest` returns has no response.data', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'subId'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEndpointType)
    })

    it('handles the case where `validateParticipant` returns null', async () => {
      expect.hasAssertions()
      // Arrange
      const logStub = sandbox.stub(logger.constructor.prototype, 'error')
      participant.validateParticipant = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      expect(logStub.getCall(0).args[1].message).toBe(ERROR_MESSAGES.sourceFspNotFound)
    })

    it('handles case where type is not in `PartyAccountTypes`', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles case where type is not in `PartyAccountTypes` and `sendErrorToParticipant` fails', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles case where SubId is supplied but validation fails and an error is thrown while sending error callback', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE',
        SubId: 'subId'
      }
      const method = 'put'
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.putParticipantsByTypeAndID(headers, params, method, payload)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEndpointType)
    })
  })

  describe('putParticipantsErrorByTypeAndID', () => {
    let sandbox

    beforeEach(() => {
      sandbox = Sinon.createSandbox()
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('handles PUT /error', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.info = sandbox.stub()
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Config.HUB_NAME
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const payload = {
        fspId: 'payerfsp',
        currency: 'USD'
      }
      const dataUri = ''

      // Act
      await participantsDomain.putParticipantsErrorByTypeAndID(headers, params, payload, dataUri)

      expect(participant.sendErrorToParticipant.callCount).toBe(1)

      // Assert
      expect(Logger.info.callCount).toBe(0)
      expect(Logger.error.callCount).toBe(0)
    })

    it('handles PUT /error when SubId is supplied', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.info = sandbox.stub()
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Config.HUB_NAME
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'SubId'
      }
      const payload = {
        fspId: 'payerfsp',
        currency: 'USD'
      }
      const dataUri = ''

      // Act
      await participantsDomain.putParticipantsErrorByTypeAndID(headers, params, payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedCallbackEndpointType)
      expect(Logger.error.callCount).toBe(0)
    })

    it('handles PUT /error when SubId supplied but validateParticipant fails to return participant', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.info = sandbox.stub()
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves(null)
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Config.HUB_NAME
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'SubId'
      }
      const payload = {
        fspId: 'payerfsp',
        currency: 'USD'
      }
      const dataUri = ''

      // Act
      await participantsDomain.putParticipantsErrorByTypeAndID(headers, params, payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedCallbackEndpointType)
      expect(Logger.error.callCount).toBe(0)
    })

    it('handles PUT /error when SubId supplied but validateParticipant throws error', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().throws(new Error('Validation failed'))
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Config.HUB_NAME
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'SubId'
      }
      const payload = {
        fspId: 'payerfsp',
        currency: 'USD'
      }
      const dataUri = ''

      // Act
      await participantsDomain.putParticipantsErrorByTypeAndID(headers, params, payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[1]).toBe(expectedCallbackEndpointType)
    })

    it('handles PUT /error when `sendErrorToParticipant` throws error', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('sendErrorToParticipant failed'))
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Config.HUB_NAME
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const payload = {
        fspId: 'payerfsp',
        currency: 'USD'
      }
      const dataUri = ''

      // Act
      await participantsDomain.putParticipantsErrorByTypeAndID(headers, params, payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(2)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      const secondCallArgs = participant.sendErrorToParticipant.getCall(1).args
      expect(firstCallArgs[1]).toBe(expectedCallbackEndpointType)
      expect(secondCallArgs[0]).toBe(Config.HUB_NAME)
    })

    it('handles PUT /error when SubId is supplied and `sendErrorToParticipant` throws error', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('sendErrorToParticipant failed'))
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Config.HUB_NAME
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'SubId'
      }
      const payload = {
        fspId: 'payerfsp',
        currency: 'USD'
      }
      const dataUri = ''

      // Act
      await participantsDomain.putParticipantsErrorByTypeAndID(headers, params, payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(2)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      const secondCallArgs = participant.sendErrorToParticipant.getCall(1).args
      expect(firstCallArgs[1]).toBe(expectedCallbackEndpointType)
      expect(secondCallArgs[0]).toBe(Config.HUB_NAME)
    })
  })

  describe('postParticipants', () => {
    let sandbox

    beforeEach(() => {
      sandbox = Sinon.createSandbox()
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('sends the request to the participant', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        },
        status: 201
      })
      participant.sendRequest = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload, Helper.mockSpan())

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe(Config.HUB_NAME)
    })

    it('sends the request to the participant with SubId', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        },
        status: 201
      })
      participant.sendRequest = sandbox.stub()
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'subId'
      }
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe(Config.HUB_NAME)
      expect(firstCallArgs[2]).toBe(expectedCallbackEndpointType)
      expect(firstCallArgs[4].partyList[0].partySubIdOrType).toBe('subId')
    })

    it('handles the request without fspiop-dest header', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp2' }
          ]
        },
        status: 201
      })
      participant.sendRequest = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const payload = {
        fspId: 'fsp2',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('fsp2')
    })

    it('handles the case where `oracleRequest` returns has no response.data', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload, Helper.mockSpan())

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles the case where SubId is supplied but `oracleRequest` returns has no response.data', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'subId'
      }
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEndpointType)
    })

    it('handles the case where `validateParticipant` returns null', async () => {
      expect.hasAssertions()
      // Arrange
      const logStub = sandbox.stub(logger.constructor.prototype, 'error')
      participant.validateParticipant = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload)

      // Assert
      expect(logStub.getCall(0).args[0]).toBe(ERROR_MESSAGES.sourceFspNotFound)
    })

    it('handles case where type is not in `PartyAccountTypes`', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE'
      }
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles case where type is not in `PartyAccountTypes` and `sendErrorToParticipant` fails', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE'
      }
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles case where SubId is supplied but validation fails and an error is thrown while sending error callback', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE',
        SubId: 'subId'
      }
      const payload = {
        fspId: 'fsp1',
        currency: 'USD'
      }

      // Act
      await participantsDomain.postParticipants(headers, 'get', params, payload)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEndpointType)
    })
  })

  describe('postParticipantsBatch', () => {
    let sandbox

    beforeEach(() => {
      sandbox = Sinon.createSandbox()
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('sends a batch request to all oracles, with the given partyList', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleBatchRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { partyId: { currency: 'USD' } },
            { partyId: { currency: 'USD' } },
            { partyId: { currency: 'USD' } }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        // 'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const payload = {
        requestId: '1234-5678',
        currency: 'USD',
        partyList: [
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN }
        ]
      }
      const expected = {
        currency: 'USD',
        partyList: [
          { partyId: { currency: undefined } },
          { partyId: { currency: undefined } },
          { partyId: { currency: undefined } }
        ]
      }

      // Act
      await participantsDomain.postParticipantsBatch(headers, 'get', payload, Helper.mockSpan())

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[4]).toEqual(expected)
    })

    it('sends a batch request to all oracles, when fspiop-dest is missing', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleBatchRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { partyId: { currency: 'USD' } },
            { partyId: { currency: 'USD' } },
            { partyId: { currency: 'USD' } }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const payload = {
        requestId: '1234-5678',
        currency: 'USD',
        partyList: [
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN }
        ]
      }
      const expected = {
        currency: 'USD',
        partyList: [
          { partyId: { currency: undefined } },
          { partyId: { currency: undefined } },
          { partyId: { currency: undefined } }
        ]
      }

      // Act
      await participantsDomain.postParticipantsBatch(headers, 'get', payload)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[4]).toEqual(expected)
    })

    it('sends errors when party.fspId does not match the source and partyIdType is invalid', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleBatchRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { partyId: { currency: 'USD' } }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const payload = {
        requestId: '1234-5678',
        currency: 'USD',
        partyList: [
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp_not_valid', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp_not_valid', partyIdType: 'NOT_A_VALID_PARTY_ID' }
        ]
      }
      const expected = {
        currency: 'USD',
        partyList: [
          {
            ...ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND, undefined, undefined, undefined, [{
              key: Enums.Accounts.PartyAccountTypes.MSISDN,
              value: undefined
            }]).toApiErrorObject(Config.ERROR_HANDLING),
            partyId: payload.partyList[1]
          },
          {
            ...ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, undefined, undefined, undefined, [{
              key: 'NOT_A_VALID_PARTY_ID',
              value: undefined
            }]).toApiErrorObject(Config.ERROR_HANDLING),
            partyId: payload.partyList[2]
          },
          {
            partyId: { currency: undefined }
          }
        ]
      }

      // Act
      await participantsDomain.postParticipantsBatch(headers, 'get', payload, Helper.mockSpan())

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[4]).toEqual(expected)
    })

    it('handles error when `validateParticipant` fails and `sendErrorToParticipant` throws', async () => {
      expect.hasAssertions()
      // Arrange
      const logStub = sandbox.stub(logger.constructor.prototype, 'error')
      participant.validateParticipant = sandbox.stub().resolves(null)
      const cbError = new Error('unknown error')
      participant.sendErrorToParticipant = sandbox.stub().throws(cbError)

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const payload = {
        requestId: '1234-5678',
        currency: 'USD',
        partyList: [
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp_not_valid', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp_not_valid', partyIdType: 'NOT_A_VALID_PARTY_ID' }
        ]
      }

      // Act
      await participantsDomain.postParticipantsBatch(headers, 'get', payload, Helper.mockSpan())

      // Assert
      expect(logStub.getCall(0).firstArg).toBe(ERROR_MESSAGES.sourceFspNotFound)
      expect(logStub.getCall(2).lastArg).toEqual(cbError)
    })

    it('handles error when `oracleBatchRequest` returns no result', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendRequest = sandbox.stub().resolves({})
      oracle.oracleBatchRequest = sandbox.stub().resolves(null)

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const payload = {
        requestId: '1234-5678',
        currency: 'USD',
        partyList: [
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN }
        ]
      }

      // Act
      await participantsDomain.postParticipantsBatch(headers, 'get', payload)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[4].partyList[0].errorInformation).toBeDefined()
      expect(firstCallArgs[4].partyList[1].errorInformation).toBeDefined()
      expect(firstCallArgs[4].partyList[2].errorInformation).toBeDefined()
    })

    it('handles error when `oracleBatchRequest` returns result but no partyList', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendRequest = sandbox.stub().resolves({})
      oracle.oracleBatchRequest = sandbox.stub().resolves({
        data: {
          partyList: []
        }
      })

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Config.HUB_NAME,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const payload = {
        requestId: '1234-5678',
        currency: 'USD',
        partyList: [
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN },
          { fspId: 'fsp1', partyIdType: Enums.Accounts.PartyAccountTypes.MSISDN }
        ]
      }

      // Act
      await participantsDomain.postParticipantsBatch(headers, 'get', payload)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[4].partyList[0].errorInformation).toBeDefined()
      expect(firstCallArgs[4].partyList[1].errorInformation).toBeDefined()
      expect(firstCallArgs[4].partyList[2].errorInformation).toBeDefined()
    })

    it('should not call oracle if source-header and fspId in payload are different, and no destination [CSI-938]', async () => {
      const headers = fixtures.participantsCallHeadersDto({ destination: '' })
      const payload = {
        requestId: '0e21b07e-3117-46ca-ae22-6ee370895697',
        currency: 'MWK',
        partyList: [
          {
            fspId: 'test-mwk-dfsp',
            partyIdType: 'MSISDN',
            partyIdentifier: '16665551002'
          }
        ]
      }
      expect(headers.source).not.toBe(payload.partyList[0].fspId)
      expect(headers.destination).toBeUndefined()

      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendRequest = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().resolves({})
      oracle.oracleBatchRequest = sandbox.stub().resolves({})

      await participantsDomain.postParticipantsBatch(headers, 'put', payload, Helper.mockSpan())

      expect(oracle.oracleBatchRequest.callCount).toBe(0)
      expect(participant.sendErrorToParticipant.callCount).toBe(0)
      expect(participant.sendRequest.callCount).toBe(1)

      const { args } = participant.sendRequest.getCall(0)
      expect(args[0][Headers.FSPIOP.DESTINATION]).toBe(headers[Headers.FSPIOP.SOURCE])
      expect(args[0][Headers.FSPIOP.SOURCE]).toBe(Config.HUB_NAME)
      expect(args[1]).toBe(headers[Headers.FSPIOP.SOURCE])

      const { partyList } = args[4]
      expect(partyList.length).toBe(1)
      expect(partyList[0].errorInformation).toBeDefined()
      expect(partyList[0].partyId).toBe(payload.partyList[0])
    })
  })

  describe('deleteParticipants', () => {
    let sandbox

    beforeEach(() => {
      sandbox = Sinon.createSandbox()
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('sends DELETE request to the participant', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const method = 'delete'
      const query = {
        currency: 'USD'
      }

      // Act
      await participantsDomain.deleteParticipants(headers, params, method, query)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('fsp1')
    })

    it('sends DELETE request to the participant with SubId', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({
        data: {
          partyList: [
            { fspId: 'fsp1' }
          ]
        }
      })
      participant.sendRequest = sandbox.stub()
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'subId'
      }
      const method = 'delete'
      const query = {
        currency: 'USD'
      }

      // Act
      await participantsDomain.deleteParticipants(headers, params, method, query)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('fsp1')
      expect(firstCallArgs[2]).toBe(expectedCallbackEndpointType)
      expect(firstCallArgs[4].fspId).toBe('fsp1')
    })

    it('handles the case where `oracleRequest` returns has no response', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const method = 'delete'
      const query = {
        currency: 'USD'
      }

      // Act
      await participantsDomain.deleteParticipants(headers, params, method, query)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles the case where SubId is supplied but `oracleRequest` returns has no response', async () => {
      expect.hasAssertions()
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN',
        SubId: 'subId'
      }
      const method = 'delete'
      const query = {
        currency: 'USD'
      }

      // Act
      await participantsDomain.deleteParticipants(headers, params, method, query)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEndpointType)
    })

    it('handles the case where `validateParticipant` returns null', async () => {
      expect.hasAssertions()
      // Arrange
      const logStub = sandbox.stub(logger.constructor.prototype, 'error')
      participant.validateParticipant = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'MSISDN'
      }
      const method = 'delete'
      const query = {
        currency: 'USD'
      }

      // Act
      await participantsDomain.deleteParticipants(headers, params, method, query)

      // Assert
      expect(logStub.getCall(0).firstArg).toBe(ERROR_MESSAGES.sourceFspNotFound)
      // expect(logStub.getCall()]).toBe(ERROR_MESSAGES.sourceFspNotFound)
    })

    it('handles case where type is not in `PartyAccountTypes`', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE'
      }
      const method = 'delete'
      const query = {
        currency: 'USD'
      }

      // Act
      await participantsDomain.deleteParticipants(headers, params, method, query)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles case where type is not in `PartyAccountTypes` and `sendErrorToParticipant` fails', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE'
      }
      const method = 'delete'
      const query = {
        currency: 'USD'
      }

      // Act
      await participantsDomain.deleteParticipants(headers, params, method, query)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles case where SubId is supplied but validation fails and an error is thrown while sending error callback', async () => {
      expect.hasAssertions()
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'fsp1'
      }
      const params = {
        ID: '123456',
        Type: 'UNKNOWN_TYPE',
        SubId: 'subId'
      }
      const method = 'delete'
      const query = {
        currency: 'USD'
      }

      // Act
      await participantsDomain.deleteParticipants(headers, params, method, query)

      // Assert
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
      expect(firstCallArgs[1]).toBe(expectedErrorCallbackEndpointType)
    })
  })
})
