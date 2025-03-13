/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the 2020-2025 Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

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

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 --------------
 **********/

const Metrics = require('@mojaloop/central-services-metrics')
const libUtil = require('../../lib/util')
const { logger } = require('../../lib')
const { GetPartiesService } = require('./services')
const { createDeps } = require('./deps')

/**
 * @function getPartiesByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results to a callback url
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} query - uri query parameters of the http request
 * @param {object} span
 * @param {object} cache
 * @param {IProxyCache} [proxyCache] - IProxyCache instance
 */
const getPartiesByTypeAndID = async (headers, params, method, query, span, cache, proxyCache = undefined) => {
  const component = getPartiesByTypeAndID.name
  const histTimerEnd = Metrics.getHistogram(
    component,
    'Get party by Type and Id',
    ['success']
  ).startTimer()
  const childSpan = span ? span.getChild(component) : undefined
  const log = logger.child({ component, params })
  const stepState = libUtil.initStepState()

  const deps = createDeps({ cache, proxyCache, childSpan, log, stepState })
  const service = new GetPartiesService(deps)
  const results = {}

  try {
    await service.handleRequest({ headers, params, query, results })
    log.info('getPartiesByTypeAndID is done')
    histTimerEnd({ success: true })
  } catch (err) {
    results.fspiopError = await deps.partiesUtils.createErrorHandlerOnSendingCallback(deps.config, log)(err, headers, params, results.requester)
    histTimerEnd({ success: false })
    if (results.fspiopError) {
      libUtil.countFspiopError(results.fspiopError, { operation: component, step: stepState.step })
    }
  } finally {
    await libUtil.finishSpanWithError(childSpan, results.fspiopError)
  }
}

module.exports = getPartiesByTypeAndID
