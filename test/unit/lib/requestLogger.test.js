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
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

const requestLogger = require('../../../src/lib/requestLogger')
const fixtures = require('../../fixtures')

let sandbox
let currentLoggerIsInfoEnabled

describe('requestLogger', () => {
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    currentLoggerIsInfoEnabled = Logger.isInfoEnabled
  })

  afterEach(() => {
    sandbox.restore()
    Logger.isInfoEnabled = currentLoggerIsInfoEnabled
  })

  describe('logRequest', () => {
    it('prints the request.payload if it exists', async () => {
      // Arrange
      const infoSpy = sandbox.spy(Logger, 'info')
      const req = {
        ...fixtures.mockHapiRequestDto(),
        url: {
          path: '/123/456'
        },
        query: {},
        payload: {
          itemA: 123,
          itemB: 456
        }
      }

      // Act
      requestLogger.logRequest(req)

      // Assert
      expect(infoSpy.calledOnce).toBe(true)
      const logLine = infoSpy.firstCall.args[0]
      expect(logLine).toContain(JSON.stringify(req.headers))
      expect(logLine).toContain(JSON.stringify(req.query))
      expect(logLine).toContain(JSON.stringify(req.payload))
    })
  })

  describe('logResponse', () => {
    it('should log response statusCode', async () => {
      // Arrange
      const infoSpy = sandbox.spy(Logger, 'info')
      const req = {
        ...fixtures.mockHapiRequestDto(),
        response: {
          statusCode: 500
        }
      }

      // Act
      requestLogger.logResponse(req)

      // Assert
      const logLine = infoSpy.firstCall.args[0]
      expect(logLine).toContain(JSON.stringify(req.response.statusCode))
    })

    it('handles valid json error response', async () => {
      // Arrange
      const infoSpy = sandbox.spy(Logger, 'info')
      const response = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Invalid currency code')
      const statusCode = 123
      response.output = {
        statusCode
      }
      const req = {
        ...fixtures.mockHapiRequestDto(),
        response
      }

      // Act
      requestLogger.logResponse(req)

      // Assert
      const logLine = infoSpy.firstCall.args[0]
      expect(logLine).toContain(JSON.stringify(statusCode))
    })
  })
})
