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

const Logger = require('@mojaloop/central-services-logger')
const TimeoutHandler = require('./TimeoutHandler')
const { HANDLER_TYPES } = require('../constants')
const { Endpoints, Participants } = require('@mojaloop/central-services-shared').Util
const { CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG, CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG } = require('../lib/config')
const Util = require('../lib/util')

const registerHandlers = async (handlers) => {
  await initCaches()
  handlers.forEach(handler => {
    switch (handler) {
      case HANDLER_TYPES.TIMEOUT:
        Logger.isDebugEnabled && Logger.debug('Registering Timeout Handler')
        TimeoutHandler.register()
        break
      default:
        Logger.isDebugEnabled && Logger.debug(`Handler ${handler} not found`)
        break
    }
  })
}

const registerAllHandlers = async () => {
  Logger.isDebugEnabled && Logger.debug('Registering all handlers')
  await initCaches()
  TimeoutHandler.register()
}

const stopAllHandlers = async () => {
  Logger.isDebugEnabled && Logger.debug('Stopping all handlers')
  await TimeoutHandler.stop()
}

const initCaches = async () => {
  Logger.isDebugEnabled && Logger.debug('Initializing caches')
  await Promise.all([
    Participants.initializeCache(CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG, Util.hubNameConfig),
    Endpoints.initializeCache(CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG, Util.hubNameConfig)
  ])
}

module.exports = {
  registerHandlers,
  registerAllHandlers,
  stopAllHandlers
}
