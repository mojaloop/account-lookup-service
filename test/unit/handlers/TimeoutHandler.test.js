const { randomUUID } = require('crypto')
const CronJob = require('cron').CronJob
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const TimeoutHandler = require('../../../src/handlers/TimeoutHandler')
const TimeoutService = require('../../../src/domain/timeout')
const Config = require('../../../src/lib/config')
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
      jest.spyOn(Logger, 'error').mockImplementation()

      await expect(TimeoutHandler.timeout()).rejects.toThrow(Error)

      expect(Logger.error).toHaveBeenCalled()
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
