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
 - Shashikant Hirugade <shashikant.hirugade@modusbox.com>

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

'use strict'

const mockGetEndpoint = jest.fn()
const mockGetParticipant = jest.fn()
const mockSendRequest = jest.fn()
const mockEnums = {
  Http: {
    Headers: { FSPIOP: { DESTINATION: 'fsp1', SOURCE: 'fsp2', SWITCH: { value: 'Hub' } } },
    RestMethods: { PUT: 'PUT' },
    ResponseTypes: { JSON: 'json' },
    HeaderResources: { PARTICIPANTS: 'value' }
  },
  EndPoints: { FspEndpointTemplates: { PARTICIPANTS_GET: '/{{fsp}}/' } }
}

const src = '../../../../src'

jest.mock('@mojaloop/central-services-shared', () => ({
  Util: {
    Endpoints: { getEndpoint: mockGetEndpoint },
    Participants: { getParticipant: mockGetParticipant },
    Request: { sendRequest: mockSendRequest },
    Http: { SwitchDefaultHeaders: jest.fn() }
  },
  Enum: mockEnums
}))
const Logger = require('@mojaloop/central-services-logger')

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)

describe('participantEndpoint Facade', () => {
  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    jest.unmock('@mojaloop/sdk-standard-components')
  })

  describe('sendRequest', () => {
    it('sends the most basic request', async () => {
      // Arrange
      const mockedConfig = {
        JWS_SIGN: false,
        FSPIOP_SOURCE_TO_SIGN: 'Hub',
        PROTOCOL_VERSIONS: {
          CONTENT: {
            DEFAULT: '2.1',
            VALIDATELIST: [
              '2.1'
            ]
          },
          ACCEPT: {
            DEFAULT: '2',
            VALIDATELIST: [
              '2',
              '2.1'
            ]
          }
        }
      }

      jest.mock('../../../../src/lib/config', () => (mockedConfig))

      mockGetEndpoint.mockImplementation(() => 'https://example.com/12345')
      mockSendRequest.mockImplementation(() => Promise.resolve(true))
      const ParticipantFacade = require(`${src}/models/participantEndpoint/facade`)

      const headers = {}
      const requestedParticipant = {}
      const endpointType = 'URL'

      // Act
      const result = await ParticipantFacade.sendRequest(headers, requestedParticipant, endpointType)

      // Assert
      expect(result).toBe(true)
      expect(mockSendRequest.mock.calls[0][9]).toMatchObject({
        accept: mockedConfig.PROTOCOL_VERSIONS.ACCEPT.DEFAULT,
        content: mockedConfig.PROTOCOL_VERSIONS.CONTENT.DEFAULT
      })
    })

    it('fails to send the request', async () => {
      // Arrange
      const mockedConfig = {
        JWS_SIGN: false,
        FSPIOP_SOURCE_TO_SIGN: 'Hub',
        PROTOCOL_VERSIONS: {
          CONTENT: {
            DEFAULT: '2.1',
            VALIDATELIST: [
              '2.1'
            ]
          },
          ACCEPT: {
            DEFAULT: '2',
            VALIDATELIST: [
              '2',
              '2.1'
            ]
          }
        }
      }

      jest.mock('../../../../src/lib/config', () => (mockedConfig))

      mockGetEndpoint.mockImplementation(() => 'https://example.com/12345')
      mockSendRequest.mockImplementation(() => { throw new Error('Request failed') })
      const ParticipantFacade = require(`${src}/models/participantEndpoint/facade`)

      const headers = {}
      const requestedParticipant = {}
      const endpointType = 'URL'

      // Act
      const action = async () => ParticipantFacade.sendRequest(headers, requestedParticipant, endpointType)

      // Assert
      await expect(action()).rejects.toThrow('Request failed')
      expect(mockSendRequest.mock.calls[0][9]).toMatchObject({
        accept: mockedConfig.PROTOCOL_VERSIONS.ACCEPT.DEFAULT,
        content: mockedConfig.PROTOCOL_VERSIONS.CONTENT.DEFAULT
      })
    })

    it('should define jwsSigner and add fspiop-signature header', async () => {
      jest.mock('../../../../src/lib/config', () => ({
        JWS_SIGN: true,
        FSPIOP_SOURCE_TO_SIGN: 'Hub',
        JWS_SIGNING_KEY_PATH: 'secrets/jwsSigningKey.key',
        JWS_SIGNING_KEY: 'somekey',
        PROTOCOL_VERSIONS: {
          CONTENT: { DEFAULT: '2' },
          ACCEPT: { DEFAULT: '2' }
        }
      }))
      jest.mock('@mojaloop/sdk-standard-components') // to mock JwsSigner.getSignature()

      mockSendRequest.mockImplementation(async (args) =>/* Util.Request.sendRequest */(args))
      mockGetEndpoint.mockImplementation(() => 'https://example.com/parties/MSISDN12345')
      const participantFacade = require(`${src}/models/participantEndpoint/facade`)

      const participantName = 'fsp1'
      const headers = {
        [mockEnums.Http.Headers.FSPIOP.DESTINATION]: participantName,
        [mockEnums.Http.Headers.FSPIOP.SOURCE]: 'Hub',
        'fspiop-source': 'Hub'
      }
      const endpointType = 'URL'
      const method = 'PUT'
      const payload = {}
      await participantFacade.sendRequest(headers, participantName, endpointType, method, payload)

      const jwsSigner = mockSendRequest.mock.lastCall.at(-2) // the last but one argument
      expect(jwsSigner).toBeTruthy()
    })
  })

  describe('validateParticipant', () => {
    it('fails to validate the participant', async () => {
      // Arrange
      mockGetParticipant.mockImplementation(() => { throw new Error('Validate Request failed') })
      const fspId = 'fsp1'
      const ParticipantFacade = require(`${src}/models/participantEndpoint/facade`)

      // Act
      const action = async () => ParticipantFacade.validateParticipant(fspId)

      // Assert
      await expect(action()).rejects.toThrow('Validate Request failed')
    })
  })

  describe('sendErrorToParticipant', () => {
    it('throws an error when the request fails', async () => {
      // Arrange
      jest.mock('../../../../src/lib/config', () => ({
        JWS_SIGN: false,
        FSPIOP_SOURCE_TO_SIGN: 'Hub',
        JWS_SIGNING_KEY_PATH: 'secrets/jwsSigningKey.key',
        JWS_SIGNING_KEY: 'somekey',
        PROTOCOL_VERSIONS: {
          CONTENT: {
            DEFAULT: '2.1',
            VALIDATELIST: [
              '2.1'
            ]
          },
          ACCEPT: {
            DEFAULT: '2',
            VALIDATELIST: [
              '2',
              '2.1'
            ]
          }
        }
      }))

      mockGetEndpoint.mockImplementation(() => 'https://example.com/12345')
      mockSendRequest.mockImplementation(() => { throw new Error('Request failed') })

      const ParticipantFacade = require(`${src}/models/participantEndpoint/facade`)

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

    it('Success without JWS', async () => {
      // Arrange
      const mockedConfig = {
        JWS_SIGN: false,
        FSPIOP_SOURCE_TO_SIGN: 'Hub',
        JWS_SIGNING_KEY_PATH: 'secrets/jwsSigningKey.key',
        JWS_SIGNING_KEY: 'somekey',
        PROTOCOL_VERSIONS: {
          CONTENT: {
            DEFAULT: '2.1',
            VALIDATELIST: [
              '2.1'
            ]
          },
          ACCEPT: {
            DEFAULT: '2',
            VALIDATELIST: [
              '2',
              '2.1'
            ]
          }
        }
      }
      jest.mock('../../../../src/lib/config', () => (mockedConfig))

      mockGetEndpoint.mockImplementation(() => 'https://example.com/12345')
      mockSendRequest.mockImplementation(() => Promise.resolve(true))

      const ParticipantFacade = require(`${src}/models/participantEndpoint/facade`)
      const spy = jest.spyOn(ParticipantFacade, 'sendErrorToParticipant')

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
      await action()

      // Assert
      expect(spy).toHaveBeenCalled()
      expect(mockSendRequest.mock.calls[0][8]).toBe(null)
      expect(mockSendRequest.mock.calls[0][9]).toMatchObject({
        accept: mockedConfig.PROTOCOL_VERSIONS.ACCEPT.DEFAULT,
        content: mockedConfig.PROTOCOL_VERSIONS.CONTENT.DEFAULT
      })
      spy.mockRestore()
    })

    it('adds jws signature when enabled', async () => {
      // Arrange
      const mockedConfig = {
        JWS_SIGN: true,
        FSPIOP_SOURCE_TO_SIGN: 'Hub',
        JWS_SIGNING_KEY_PATH: 'secrets/jwsSigningKey.key',
        JWS_SIGNING_KEY: 'somekey',
        PROTOCOL_VERSIONS: {
          CONTENT: {
            DEFAULT: '2.1',
            VALIDATELIST: [
              '2.1'
            ]
          },
          ACCEPT: {
            DEFAULT: '2',
            VALIDATELIST: [
              '2',
              '2.1'
            ]
          }
        }
      }

      jest.mock('../../../../src/lib/config', () => (mockedConfig))

      mockGetEndpoint.mockImplementation(() => 'https://example.com/parties/MSISDN12345')
      mockSendRequest.mockImplementation(() => Promise.resolve(true))

      const ParticipantFacade = require(`${src}/models/participantEndpoint/facade`)
      const spy = jest.spyOn(ParticipantFacade, 'sendErrorToParticipant')

      const participantName = 'fsp1'
      const endpointType = 'URL'
      const errorInformation = {
        message: 'Test error message'
      }
      const headers = {}
      headers[mockEnums.Http.Headers.FSPIOP.DESTINATION] = 'fsp1'
      headers[mockEnums.Http.Headers.FSPIOP.SOURCE] = 'Hub'

      // Act
      const action = async () => ParticipantFacade.sendErrorToParticipant(participantName, endpointType, errorInformation, headers)
      await action()

      // Assert
      expect(spy).toHaveBeenCalled()
      expect(typeof (mockSendRequest.mock.calls[0][8])).toBe('object')
      expect(mockSendRequest.mock.calls[0][9]).toMatchObject({
        accept: mockedConfig.PROTOCOL_VERSIONS.ACCEPT.DEFAULT,
        content: mockedConfig.PROTOCOL_VERSIONS.CONTENT.DEFAULT
      })
      spy.mockRestore()
    })
  })
})
