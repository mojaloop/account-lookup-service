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

 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 - Henk Kodde <henk.kodde@modusbox.com>
 - Steven Oderayi <steven.oderayi@modusbox.com>
 - Juan Correa <juan.correa@modusbox.com>
 - James Bush <james.bush@modusbox.com>

 --------------
 ******/

'use strict'

const Metrics = require('@mojaloop/central-services-metrics')
const libUtil = require('../../lib/util')
const { logger } = require('../../lib')
const { createDeps } = require('./deps')
const services = require('./services')

/**
 * Sends a callback to inform participant of successful lookup
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {string} method - http request method
 * @param {object} payload - payload of the request being sent out
 * @param {string} dataUri - encoded payload of the request being sent out
 * @param {CacheClient} cache - in-memory cache with CatboxMemory engine
 * @param {IProxyCache} [proxyCache] - IProxyCache instance
 */
const putPartiesByTypeAndID = async (headers, params, method, payload, dataUri, cache, proxyCache = undefined) => {
  // think, if we need to pass span here
  const component = putPartiesByTypeAndID.name
  const histTimerEnd = Metrics.getHistogram(
    component,
    'Put parties by type and id',
    ['success']
  ).startTimer()
  // const childSpan = span ? span.getChild(component) : undefined
  const deps = createDeps({ cache, proxyCache })
  const service = new services.PutPartiesService(deps, { headers, params, payload, dataUri })
  let fspiopError

  try {
    await service.handleRequest()
    logger.info('putPartiesByTypeAndID is done')
    histTimerEnd({ success: true })
  } catch (error) {
    fspiopError = await service.handleError(error)
    if (fspiopError) {
      libUtil.countFspiopError(fspiopError, { operation: component, step: service.currenStep })
    }
    histTimerEnd({ success: false })
  }
}

/**
 * Sends error callback to inform participant of failed lookup
 *
 * @param {object} headers - incoming http request headers
 * @param {object} params - uri parameters of the http request
 * @param {object} payload - payload of the request being sent out
 * @param {string} dataUri - encoded payload of the request being sent out
 * @param {object} span
 * @param {CacheClient} cache - in-memory cache with CatboxMemory engine
 * @param {IProxyCache} [proxyCache] - IProxyCache instance
 */
const putPartiesErrorByTypeAndID = async (headers, params, payload, dataUri, span, cache, proxyCache = undefined) => {
  const component = putPartiesErrorByTypeAndID.name
  const histTimerEnd = Metrics.getHistogram(
    component,
    'Put parties error by type and id',
    ['success']
  ).startTimer()
  const childSpan = span ? span.getChild(component) : undefined
  const deps = createDeps({ cache, proxyCache, childSpan })
  const inputs = { headers, params, payload, dataUri }
  const service = new services.PutPartiesErrorService(deps, inputs)
  let fspiopError

  try {
    await service.handleRequest()
    logger.info('putPartiesErrorByTypeAndID is done')
    histTimerEnd({ success: true })
  } catch (error) {
    fspiopError = await service.handleError(error)
    if (fspiopError) {
      libUtil.countFspiopError(fspiopError, { operation: component, step: service.currenStep })
    }
    histTimerEnd({ success: false })
  } finally {
    await libUtil.finishSpanWithError(childSpan, fspiopError)
  }
}

module.exports = {
  putPartiesByTypeAndID,
  putPartiesErrorByTypeAndID
}
