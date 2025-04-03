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

const { Factory: { reformatFSPIOPError } } = require('@mojaloop/central-services-error-handling')
const { EventStateMetadata, EventStatusType } = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')

const { logger } = require('../../lib')
const { countFspiopError } = require('../../lib/util')
const { createDeps } = require('../parties/deps')
const { TimeoutPartiesService } = require('../parties/services')

const timeoutInterschemePartiesLookups = async ({ proxyCache, batchSize }) => {
  const operation = timeoutInterschemePartiesLookups.name
  logger.info(`${operation} start...`, { batchSize })
  return proxyCache.processExpiredAlsKeys(
    (key) => sendTimeoutCallback(key, proxyCache, operation), batchSize
  )
}

const timeoutProxyGetPartiesLookups = async ({ proxyCache, batchSize }) => {
  const operation = timeoutProxyGetPartiesLookups.name
  logger.info(`${operation} start...`, { batchSize })
  return proxyCache.processExpiredProxyGetPartiesKeys(
    (key) => sendTimeoutCallback(key, proxyCache, operation), batchSize
  )
}

const sendTimeoutCallback = async (cacheKey, proxyCache, operation) => {
  const histTimerEnd = Metrics.getHistogram(
    'eg_timeoutInterschemePartiesLookups',
    'Egress - Interscheme parties lookup timeout callback',
    ['success']
  ).startTimer()
  const log = logger.child({ cacheKey, operation })
  const deps = createDeps({ proxyCache, log })
  const service = TimeoutPartiesService.createInstance(deps, cacheKey, operation)
  const span = service.deps.childSpan

  try {
    await service.handleExpiredKey()
    histTimerEnd({ success: true })
  } catch (err) {
    log.warn('error in sendTimeoutCallback: ', err)
    histTimerEnd({ success: false })
    const fspiopError = reformatFSPIOPError(err)
    countFspiopError(fspiopError, { operation, step: service?.currenStep })

    await finishSpan(span, fspiopError)
    throw fspiopError
  }
}

const finishSpan = async (span, err) => {
  if (!span.isFinished) {
    const state = new EventStateMetadata(
      EventStatusType.failed,
      err.apiErrorCode.code,
      err.apiErrorCode.message
    )
    await span.error(err, state)
    await span.finish(err.message, state)
  }
}

module.exports = {
  timeoutInterschemePartiesLookups,
  timeoutProxyGetPartiesLookups,
  sendTimeoutCallback // Exposed for testing
}
