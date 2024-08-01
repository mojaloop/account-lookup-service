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
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * INFITX
 - Steven Oderayi <steven.oderayi@infitx.com>
 --------------
 ******/

'use strict'

const { randomUUID } = require('crypto')
const CronJob = require('cron').CronJob
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const TimeoutHandler = require('../../../src/handlers/TimeoutHandler')
const TimeoutService = require('../../../src/domain/timeout')
const Config = require('../../../src/lib/config')
const { logger } = require('../../../src/lib')
const DefaultConfig = { ...Config }

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

describe('TimeoutHandler', () => {
  beforeEach(() => {
    jest.spyOn(CronJob, 'from').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn()
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('timeout', () => {
    it('should execute timout service', async () => {
      jest.spyOn(TimeoutService, 'timeoutInterschemePartiesLookups').mockResolvedValue()
      await expect(TimeoutHandler.timeout()).resolves.toBeUndefined()
      expect(TimeoutService.timeoutInterschemePartiesLookups).toHaveBeenCalled()
    })

    it('should log error and throw reformatFSPIOPError', async () => {
      jest.spyOn(TimeoutService, 'timeoutInterschemePartiesLookups').mockRejectedValue(new Error(randomUUID()))
      jest.spyOn(ErrorHandler.Factory, 'reformatFSPIOPError').mockReturnValue(new Error(randomUUID()))
      jest.spyOn(logger, 'error')

      await expect(TimeoutHandler.timeout()).rejects.toThrow(Error)

      expect(logger.error).toHaveBeenCalled()
      expect(ErrorHandler.Factory.reformatFSPIOPError).toHaveBeenCalled()
    })

    it('should not run if isRunning is true', async () => {
      jest.spyOn(TimeoutService, 'timeoutInterschemePartiesLookups').mockImplementation(async () => {
        await wait(1000)
      })
      await Promise.all([
        TimeoutHandler.timeout(),
        TimeoutHandler.timeout()
      ])
      expect(TimeoutService.timeoutInterschemePartiesLookups).toHaveBeenCalledTimes(1)
    })
  })

  describe('register', () => {
    it('should register handler', async () => {
      jest.spyOn(TimeoutHandler, 'stop')
      const result = await TimeoutHandler.register()

      expect(result).toBe(true)
      expect(TimeoutHandler.stop).not.toHaveBeenCalled()
      expect(CronJob.from).toHaveBeenCalledWith({
        start: false,
        onTick: expect.any(Function),
        cronTime: Config.HANDLERS_TIMEOUT_TIMEXP,
        timeZone: Config.HANDLERS_TIMEOUT_TIMEZONE
      })
      expect(CronJob.from().start).toHaveBeenCalled()

      await TimeoutHandler.stop()
    })

    it('should not register handler if HANDLERS_TIMEOUT_DISABLED is true', async () => {
      Config.HANDLERS_TIMEOUT_DISABLED = true

      const result = await TimeoutHandler.register()

      expect(result).toBe(false)
      expect(CronJob.from).not.toHaveBeenCalled()
      Config.HANDLERS_TIMEOUT_DISABLED = DefaultConfig.HANDLERS_TIMEOUT_DISABLED
    })
  })

  describe('stop', () => {
    it('should stop handler', async () => {
      jest.spyOn(TimeoutHandler, 'register')
      await TimeoutHandler.register()
      await TimeoutHandler.stop()

      expect(CronJob.from().stop).toHaveBeenCalled()
      expect(TimeoutHandler.register).toHaveBeenCalled()
    })

    it('should not stop if not registered', async () => {
      jest.spyOn(TimeoutHandler, 'register')
      await TimeoutHandler.stop()

      expect(CronJob.from().stop).not.toHaveBeenCalled()
      expect(TimeoutHandler.register).not.toHaveBeenCalled()
    })
  })
})
