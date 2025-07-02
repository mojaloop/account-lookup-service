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

const CronJob = require('cron').CronJob
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const TimeoutService = require('../domain/timeout')
const Config = require('../lib/config')
const { createDistLock } = require('../lib')

let timeoutJob
let isRegistered
let isRunning
let distLock

const timeout = async (options) => {
  if (isRunning) return
  const { logger } = options

  try {
    isRunning = true
    if (!await distLock?.acquireLock()) return
    await TimeoutService.timeoutInterschemePartiesLookups(options)
    await TimeoutService.timeoutProxyGetPartiesLookups(options)
    logger.verbose('ALS timeout handler is done')
  } catch (err) {
    logger.error('error in timeout: ', err)
  } finally {
    await distLock?.releaseLock()
    isRunning = false
  }
}

const register = async (options) => {
  if (Config.HANDLERS_TIMEOUT_DISABLED) return false
  const { logger } = options

  try {
    if (isRegistered) {
      logger.info('Timeout handler already registered')
      return false
    }
    timeoutJob = CronJob.from({
      start: false,
      onTick: () => timeout(options),
      cronTime: Config.HANDLERS_TIMEOUT_TIMEXP,
      timeZone: Config.HANDLERS_TIMEOUT_TIMEZONE
    })
    distLock = createDistLock(Config.HANDLERS_TIMEOUT?.DIST_LOCK, logger)
    timeoutJob.start()
    isRegistered = true
    logger.info('Timeout handler registered')
    return true
  } catch (err) {
    logger.error('error in register:', err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const stop = async () => {
  if (isRegistered) {
    await timeoutJob.stop()
    await distLock?.releaseLock()
    isRegistered = false
  }
}

module.exports = {
  timeout,
  register,
  stop
}
