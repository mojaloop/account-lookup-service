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
const request = require('@mojaloop/central-services-shared').Util.Request
const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints

const ParticipantFacade = require('../../../../src/models/participantEndpoint/facade')

let sandbox

describe('Oracle Facade', () => {
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(request)
    sandbox.stub(Endpoints)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('sendRequest', () => {
    it('sends the most basic request', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.resolves(true)
      Endpoints.getEndpoint = sandbox.stub().resolves('https://example.com/12345')

      const headers = {}
      const requestedParticipant = {}
      const endpointType = 'URL'

      // Act
      const result = await ParticipantFacade.sendRequest(headers, requestedParticipant, endpointType)

      // Assert
      expect(result).toBe(true)
      // await expect(action()).rejects.toThrow('Request failed')
    })

    it('fails to send the request', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.throws(new Error('Request failed'))
      Endpoints.getEndpoint = sandbox.stub().resolves('https://example.com/12345')

      const headers = {}
      const requestedParticipant = {}
      const endpointType = 'URL'

      // Act
      const action = async () => ParticipantFacade.sendRequest(headers, requestedParticipant, endpointType)

      // Assert
      await expect(action()).rejects.toThrow('Request failed')
    })
  })

  describe('validateParticipant', () => {
    it('fails to validate the participant', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.throws(new Error('Validate Request failed'))
      const fspId = 'fsp1'

      // Act
      const action = async () => ParticipantFacade.validateParticipant(fspId)

      // Assert
      await expect(action()).rejects.toThrow('Validate Request failed')
    })
  })

  describe('sendErrorToParticipant', () => {
    it('throws an error when the request fails', async () => {
      // Arrange
      const requestStub = sandbox.stub()
      request.sendRequest = requestStub
      requestStub.throws(new Error('Request failed'))
      Endpoints.getEndpoint = sandbox.stub().resolves('https://example.com/12345')

      const participantName = 'fsp1'
      const endpointType = 'URL'
      const errorInformation = {
        message: 'Test error message'
      }
      const headers = {}
      const params = {}
      const payload = { requestId: '1234-5678' }

      // Act
      const action = async () => ParticipantFacade.sendErrorToParticipant(participantName, endpointType, errorInformation, headers, params, payload)

      // Assert
      await expect(action()).rejects.toThrow('Request failed')
    })
  })
})
