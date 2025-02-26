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

const Metrics = require('@mojaloop/central-services-metrics')
const { Endpoints, Participants } = require('@mojaloop/central-services-shared').Util
const TimeoutHandler = require('./TimeoutHandler')
const { HANDLER_TYPES } = require('../constants')
const Config = require('../lib/config')
const Util = require('../lib/util')
const Monitoring = require('./monitoring')

/**
 * Register handlers
 *
 * @param {*} handlers Array of handlers names
 * @param {*} options { proxyCache: ProxyCache, batchSize: number, logger: Logger }
 */
const registerHandlers = async (handlers, options) => {
  const { logger } = options
  await init(options)

  for (const handler of handlers) {
    switch (handler) {
      case HANDLER_TYPES.TIMEOUT:
        logger.debug('Registering Timeout Handler')
        await TimeoutHandler.register(options)
        break
      default:
        logger.warn(`Handler ${handler} not found`)
        break
    }
  }
}

/**
 * Register all handlers
 *
 * @param {*} options { proxyCache: ProxyCache, batchSize: number }
 */

const registerAllHandlers = async (options) => {
  options.logger.debug('Registering all handlers')
  await init(options)
  TimeoutHandler.register(options)
}

const stopAllHandlers = async (options) => {
  options.logger.debug('Stopping all handlers')
  await Promise.all([
    TimeoutHandler.stop(),
    Monitoring.stop()
  ])
}

const init = async (options) => {
  options.logger.debug('Initializing caches and metrics')
  !Config.INSTRUMENTATION_METRICS_DISABLED && Metrics.setup(Config.INSTRUMENTATION_METRICS_CONFIG)
  await Promise.all([
    Participants.initializeCache(Config.CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG, Util.hubNameConfig),
    Endpoints.initializeCache(Config.CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG, Util.hubNameConfig),
    Monitoring.start({
      enabled: !Config.INSTRUMENTATION_METRICS_DISABLED,
      port: Config.HANDLERS_MONITORING_PORT,
      metricsConfig: Config.INSTRUMENTATION_METRICS_CONFIG,
      proxyCache: options.proxyCache
    })
  ])
}

module.exports = {
  registerHandlers,
  registerAllHandlers,
  stopAllHandlers
}
