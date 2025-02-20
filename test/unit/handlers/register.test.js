/*****
 License
 --------------
 Copyright © 2020-2024 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0
 (the "License") and you may not use these files except in compliance with the [License](http://www.apache.org/licenses/LICENSE-2.0).

 You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the [License](http://www.apache.org/licenses/LICENSE-2.0).

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * INFITX
 - Steven Oderayi <steven.oderayi@infitx.com>
 --------------
 ******/

'use strict'

const TimeoutHandler = require('../../../src/handlers/TimeoutHandler')
const { HANDLER_TYPES } = require('../../../src/constants')
const { registerHandlers, registerAllHandlers, stopAllHandlers } = require('../../../src/handlers/register')
const Monitoring = require('../../../src/handlers/monitoring')
const { logger } = require('../../../src/lib')

describe('RegisterHandlers', () => {
  let mockOptions

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(logger, 'debug')
    jest.spyOn(logger, 'warn')
    TimeoutHandler.register = jest.fn()
    Monitoring.start = jest.fn()
    Monitoring.stop = jest.fn()
    const mockProxyCache = { processExpiredAlsKeys: jest.fn() }
    mockOptions = { proxyCache: mockProxyCache, batchSize: 10, logger }
  })

  describe('registerHandlers', () => {
    it('should register all handlers', async () => {
      const handlers = [HANDLER_TYPES.TIMEOUT]
      await registerHandlers(handlers, mockOptions)

      expect(logger.debug).toHaveBeenCalledWith('Registering Timeout Handler')
      expect(TimeoutHandler.register).toHaveBeenCalled()
    })

    it('should not register unknown handlers', async () => {
      const handlers = ['unknown']
      await registerHandlers(handlers, mockOptions)

      expect(logger.warn).toHaveBeenCalledWith('Handler unknown not found')
    })
  })

  describe('registerAllHandlers', () => {
    it('should register all handlers', async () => {
      await registerAllHandlers(mockOptions)

      expect(logger.debug).toHaveBeenCalledWith('Registering all handlers')
      expect(TimeoutHandler.register).toHaveBeenCalled()
    })
  })

  describe('stopAllHandlers', () => {
    it('should stop all handlers', async () => {
      jest.spyOn(TimeoutHandler, 'stop')

      await stopAllHandlers({ logger })

      expect(logger.debug).toHaveBeenCalledWith('Stopping all handlers')
      expect(TimeoutHandler.stop).toHaveBeenCalled()
    })
  })
})
