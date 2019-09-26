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
const Util = require('util')

const requestLogger = require('../../../src/lib/requestLogger')
const Logger = require('@mojaloop/central-services-logger')

let sandbox

describe('requestLogger', () => {
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    // sandbox.stub(Logger)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('logRequest', () => {
    it('prints the request.body if it exists', async () => {
      // Arrange
      const debugSpy = sandbox.spy(Logger, 'debug')
      const req = {
        method: 'GET',
        url: {
          path: '/123/456'
        },
        query: {},
        headers: {},
        body: {
          itemA: 123,
          itemB: 456
        }
      }

      // Act
      requestLogger.logRequest(req)

      // Assert
      expect(debugSpy.calledThrice).toBe(true)
    })
  })

  describe('logResponse', () => {
    it('handles deseralizing invalid JSON', async () => {
      // Arrange
      const infoSpy = sandbox.spy(Logger, 'info')
      const req = {
        response: {
          source: {
            itemA: true
          },
          statusCode: 500
        }
      }
      /* Make some circular JSON to break JSON.stringify() */
      const inner = {}
      const outer = {
        inner
      }
      inner[outer] = outer
      req.response.source = outer

      // Act
      requestLogger.logResponse(req)

      // Assert
      const result = infoSpy.calledWith(`ALS-Trace - Response: ${Util.inspect(req.response.source)} Status: ${req.response.statusCode}`)
      expect(result).toBe(true)
    })

    it('handles valid json', async () => {
      // Arrange
      const infoSpy = sandbox.spy(Logger, 'info')
      const req = {
        response: {
          source: {
            itemA: true
          },
          statusCode: 500
        }
      }

      // Act
      requestLogger.logResponse(req)

      // Assert
      const result = infoSpy.calledWith(`ALS-Trace - Response: ${JSON.stringify(req.response.source)} Status: ${req.response.statusCode}`)
      expect(result).toBe(true)
    })

    it('handles if response is null or undefined after JSON stringifying', async () => {
      // Arrange
      const infoSpy = sandbox.spy(Logger, 'info')
      const req = {
        response: {
          statusCode: 500
        }
      }
      // Act
      requestLogger.logResponse(req)

      // Assert
      const result = infoSpy.calledWith('ALS-Trace - Response: [object Object]')
      expect(result).toBe(true)
    })
  })
})
