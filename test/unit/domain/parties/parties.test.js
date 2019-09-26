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

const request = require('@mojaloop/central-services-shared').Util.Request
const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints
const Util = require('@mojaloop/central-services-shared').Util
const Logger = require('@mojaloop/central-services-logger')
const {
  encodePayload
} = require('@mojaloop/central-services-shared').Util.StreamingProtocol

const Helper = require('../../../util/helper')
const DB = require('../../../../src/lib/db')
const partiesDomain = require('../../../../src/domain/parties/parties')
const Config = require('../../../../src/lib/config')
const participant = require('../../../../src/models/participantEndpoint/facade')
const oracle = require('../../../../src/models/oracle/facade')

let sandbox

describe('Parties Tests', () => {
  beforeEach(async () => {
    await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
    sandbox = Sinon.createSandbox()
    sandbox.stub(request)
    sandbox.stub(Util.Http, 'SwitchDefaultHeaders').returns(Helper.defaultSwitchHeaders)
    DB.oracleEndpoint = {
      query: sandbox.stub()
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('getPartiesByTypeAndID', () => {
    beforeEach(() => {
      sandbox.stub(participant)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('handles error case where destination header is missing', async () => {
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
        date: '2019-05-24 08:52:19',
        'fspiop-source': 'payerfsp'
      }
      const expectedHeaders = {
        ...headers,
        'fspiop-source': 'payerfsp',
        'fspiop-destination': 'fsp1'
      }

      // Act
      await partiesDomain.getPartiesByTypeAndID(headers, Helper.getByTypeIdRequest.params, Helper.getByTypeIdRequest.method, Helper.getByTypeIdRequest.query)

      // Assert
      const lastCallHeaderArgs = participant.sendRequest.getCall(0).args
      expect(participant.sendRequest.callCount).toBe(1)
      expect(lastCallHeaderArgs[0]).toStrictEqual(expectedHeaders)
      expect(lastCallHeaderArgs[1]).toBe('fsp1')
    })

    it('handles error when `participant.validateParticipant()`cannot be found', async () => {
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
      expect(firstCallArgs[0]).toBe('Requester FSP not found')
      expect(secondCallArgs[0].name).toBe('FSPIOPError')
    })

    it('handles error when `participant.validateParticipant()`cannot be found and `sendErrorToParticipant()` fails', async () => {
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
        'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
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
  })

  describe('putPartiesByTypeAndID', () => {
    beforeEach(() => {
      sandbox.stub(participant)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('successfully sends the callback to the participant', async () => {
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves({
        data: {
          name: 'fsp1'
        }
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

    it('handles error when `participant.validateParticipant()` returns no participant', async () => {
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

    it('handles error when `participant.validateParticipant()` is found and `sendErrorToParticipant()` fails', async () => {
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
  })

  describe('putPartiesErrorByTypeAndID', () => {
    beforeEach(() => {
      sandbox.stub(participant)
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('succesfully sends error to the participant', async () => {
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
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, 'put', payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[0]).toStrictEqual('payeefsp')
    })

    it('sends error to the participant when there is no destination participant', async () => {
      // Arrange
      participant.validateParticipant = sandbox.stub().resolves(null)
      participant.sendErrorToParticipant = sandbox.stub().throws(new Error('Unknown error'))
      const payload = JSON.stringify({ errorPayload: true })
      const dataUri = encodePayload(payload, 'application/json')

      // Act
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, 'put', payload, dataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(2)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[0]).toStrictEqual('payerfsp')
    })

    it('handles error when `decodePayload()` fails', async () => {
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
      await partiesDomain.putPartiesErrorByTypeAndID(Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.params, payload, invalidDataUri)

      // Assert
      expect(participant.sendErrorToParticipant.callCount).toBe(1)
      const sendErrorCallArgs = participant.sendErrorToParticipant.getCall(0).args
      expect(sendErrorCallArgs[0]).toStrictEqual('payerfsp')
    })
  })
})
