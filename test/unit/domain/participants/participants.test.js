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

const participantsDomain = require('../../../../src/domain/participants/participants')
const participant = require('../../../../src/models/participantEndpoint/facade')
const oracle = require('../../../../src/models/oracle/facade')
const Helper = require('../../../util/helper')
const Config = require('../../../../src/lib/config')

describe('Participant Tests', () => {
  describe('getParticipantsByTypeAndID', () => {
    let sandbox

    beforeEach(() => {
      sandbox = Sinon.createSandbox()
      sandbox.stub(participant)
      sandbox.stub(oracle)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('gets participants and sends callback', async () => {
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
        Helper.getByTypeIdCurrencyRequest.query
      ]

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('payeefsp')
    })

    it('gets participants and sends callback when SubId is supplied', async () => {
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
      expect(firstCallArgs[6].partySubIdOrType).toBe('subId')
    })

    it('fails to get participants and sends error callback with appropriate endpoint type when SubId is specified', async () => {
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
        Helper.getByTypeIdCurrencyRequest.query
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const args = [
        headers,
        Helper.getByTypeIdCurrencyRequest.params,
        Helper.getByTypeIdCurrencyRequest.method,
        Helper.getByTypeIdCurrencyRequest.query
      ]

      // Act
      await participantsDomain.getParticipantsByTypeAndID(...args)

      // Assert
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('fsp1')
    })

    it('fails with `Requester FSP not found` if `validateParticipant` fails', async () => {
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves(null)
      const logErrorStub = sandbox.stub(Logger, 'error')

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
      const firstCallArgs = logErrorStub.getCall(0).args
      expect(firstCallArgs[0]).toBe('Requester FSP not found')
    })

    it('fails when `oracleRequest` response is empty', async () => {
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
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('switch')
    })

    it('sends put request to the participant with SubId', async () => {
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
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('switch')
      expect(firstCallArgs[2]).toBe(expectedCallbackEndpointType)
      expect(firstCallArgs[4].partyList[0].partySubIdOrType).toBe('subId')
    })

    it('handles put request without fspiop-dest header', async () => {
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves(null)
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      const loggerFirstCallArgs = Logger.error.getCall(0).args
      expect(loggerFirstCallArgs[0]).toBe('Requester FSP not found')
    })

    it('handles case where type is not in `PartyAccountTypes`', async () => {
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Enums.Http.Headers.FSPIOP.SWITCH.value
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Enums.Http.Headers.FSPIOP.SWITCH.value
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Enums.Http.Headers.FSPIOP.SWITCH.value
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
      // Arrange
      sandbox.stub(Logger)
      Logger.info = sandbox.stub()
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().throws(new Error('Validation failed'))
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Enums.Http.Headers.FSPIOP.SWITCH.value
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
      expect(Logger.error.callCount).toBe(1)
    })

    it('handles PUT /error when `sendErrorToParticipant` throws error', async () => {
      // Arrange
      sandbox.stub(Logger)
      Logger.info = sandbox.stub()
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('sendErrorToParticipant failed'))
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Enums.Http.Headers.FSPIOP.SWITCH.value
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
      expect(secondCallArgs[0]).toBe('switch')
      expect(Logger.error.callCount).toBe(2)
    })

    it('handles PUT /error when SubId is supplied and `sendErrorToParticipant` throws error', async () => {
      // Arrange
      sandbox.stub(Logger)
      Logger.info = sandbox.stub()
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('sendErrorToParticipant failed'))
      const expectedCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': 'payerfsp',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        date: '2019-05-24 08:52:19',
        'fspiop-source': Enums.Http.Headers.FSPIOP.SWITCH.value
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
      expect(secondCallArgs[0]).toBe('switch')
      expect(Logger.error.callCount).toBe(2)
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
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      expect(participant.sendRequest.callCount).toBe(1)
      const firstCallArgs = participant.sendRequest.getCall(0).args
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('switch')
    })

    it('sends the request to the participant with SubId', async () => {
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
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      expect(firstCallArgs[0][Enums.Http.Headers.FSPIOP.DESTINATION]).toBe('switch')
      expect(firstCallArgs[2]).toBe(expectedCallbackEndpointType)
      expect(firstCallArgs[4].partyList[0].partySubIdOrType).toBe('subId')
    })

    it('handles the request without fspiop-dest header', async () => {
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const firstCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(firstCallArgs[0]).toBe('fsp1')
    })

    it('handles the case where SubId is supplied but `oracleRequest` returns has no response.data', async () => {
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves({})
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves(null)
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      const loggerFirstCallArgs = Logger.error.getCall(0).args
      expect(loggerFirstCallArgs[0]).toBe('Requester FSP not found')
    })

    it('handles case where type is not in `PartyAccountTypes`', async () => {
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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

    it('sends a batch request to all oracles, when fspiop-dest is missing', async () => {
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND, undefined, undefined, undefined, [{
            key: Enums.Accounts.PartyAccountTypes.MSISDN,
            value: undefined
          }]).toApiErrorObject(Config.ERROR_HANDLING),
          ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, undefined, undefined, undefined, [{
            key: 'NOT_A_VALID_PARTY_ID',
            value: undefined
          }]).toApiErrorObject(Config.ERROR_HANDLING),
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

    it('handles error when `validateParticipant` fails and `sendErrorToParticipant` throws', async () => {
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.validateParticipant = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('unknown error'))

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      await participantsDomain.postParticipantsBatch(headers, 'get', payload)

      // Assert
      const firstCallArgs = Logger.error.getCall(0).args
      const thirdCallArgs = Logger.error.getCall(2).args
      expect(firstCallArgs[0]).toBe('Requester FSP not found')
      expect(thirdCallArgs[0].message).toBe('unknown error')
    })

    it('handles error when `oracleBatchRequest` returns no result', async () => {
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      participant.sendRequest = sandbox.stub().resolves({})
      oracle.oracleBatchRequest = sandbox.stub().resolves(null)

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        'fspiop-destination': Enums.Http.Headers.FSPIOP.SWITCH.value,
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({})
      oracle.oracleRequest = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub()
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves(null)
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      const loggerFirstCallArgs = Logger.error.getCall(0).args
      expect(loggerFirstCallArgs[0]).toBe('Requester FSP not found')
    })

    it('handles case where type is not in `PartyAccountTypes`', async () => {
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub()

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))

      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
      // Arrange
      sandbox.stub(Logger)
      Logger.error = sandbox.stub()
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Error sending error to participant'))
      const expectedErrorCallbackEndpointType = Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_SUB_ID_PUT_ERROR
      const headers = {
        accept: 'application/vnd.interoperability.participants+json;version=1',
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
