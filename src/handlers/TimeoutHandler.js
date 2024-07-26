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

const CronJob = require('cron').CronJob
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const TimeoutService = require('../domain/timeout')
const Config = require('../lib/config')

let timeoutJob
let isRegistered
let isRunning

const timeout = async () => {
  if (isRunning) return

  try {
    isRunning = true
    Logger.isDebugEnabled && Logger.debug('Timeout handler triggered')
    await TimeoutService.timeoutInterschemePartiesLookups()
  } catch (err) {
    Logger.isErrorEnabled && Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  } finally {
    isRunning = false
  }
}

const register = async () => {
  if (Config.HANDLERS_TIMEOUT_DISABLED) return false
  try {
    if (isRegistered) {
      await stop()
    }
    timeoutJob = CronJob.from({
      start: false,
      onTick: timeout,
      cronTime: Config.HANDLERS_TIMEOUT_TIMEXP,
      timeZone: Config.HANDLERS_TIMEOUT_TIMEZONE
    })
    timeoutJob.start()
    isRegistered = true
    return true
  } catch (err) {
    Logger.isErrorEnabled && Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const stop = async () => {
  if (isRegistered) {
    await timeoutJob.stop()
    isRegistered = undefined
  }
}

module.exports = {
  timeout,
  register,
  stop
}
