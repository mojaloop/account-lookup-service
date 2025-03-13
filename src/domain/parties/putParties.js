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

const { Headers } = require('@mojaloop/central-services-shared').Enum.Http
const Metrics = require('@mojaloop/central-services-metrics')

const libUtil = require('../../lib/util')
const Config = require('../../lib/config')
const { logger } = require('../../lib')

const services = require('./services')
const { createDeps } = require('./deps')

/**
 * @function putPartiesByTypeAndID
 *
 * @description This sends a callback to inform participant of successful lookup
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
  // todo: think, if we need to pass span here
  const component = putPartiesByTypeAndID.name
  const histTimerEnd = Metrics.getHistogram(
    component,
    'Put parties by type and id',
    ['success']
  ).startTimer()
  // const childSpan = span ? span.getChild(component) : undefined
  const log = logger.child({ component, params })
  const stepState = libUtil.initStepState()

  const deps = createDeps({ cache, proxyCache, log, stepState })
  const service = new services.PutPartiesService(deps)
  const results = {}

  const source = headers[Headers.FSPIOP.SOURCE]
  const destination = headers[Headers.FSPIOP.DESTINATION]
  const proxy = headers[Headers.FSPIOP.PROXY]
  log.info('parties::putPartiesByTypeAndID start', { source, destination, proxy })

  try {
    await service.validateSourceParticipant({ source, proxy })

    if (proxy) {
      await service.checkProxySuccessResponse({ destination, source, headers, params })
    }

    const sendTo = await service.identifyDestinationForSuccessCallback(destination)
    results.requester = sendTo
    await service.sendSuccessCallback({ sendTo, headers, params, dataUri })

    log.info('putPartiesByTypeAndID callback was sent', { sendTo })
    histTimerEnd({ success: true })
  } catch (error) {
    const { requester } = results
    results.fspiopError = await service.handleError({ error, requester, headers, params })
    if (results.fspiopError) {
      libUtil.countFspiopError(results.fspiopError, { operation: component, step: stepState.step })
    }
    histTimerEnd({ success: false })
  }
}

/**
 * @function putPartiesErrorByTypeAndID
 *
 * @description This populates the cache of endpoints
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
  const log = logger.child({ component, params })
  const stepState = libUtil.initStepState()

  const deps = createDeps({ cache, proxyCache, childSpan, log, stepState })
  const service = new services.PutPartiesErrorService(deps)
  const results = {}

  const destination = headers[Headers.FSPIOP.DESTINATION]
  const proxyEnabled = !!(Config.PROXY_CACHE_CONFIG.enabled && proxyCache)
  const proxy = proxyEnabled && headers[Headers.FSPIOP.PROXY]
  log.info('parties::putPartiesErrorByTypeAndID start', { destination, proxy })

  try {
    if (proxy) {
      const notValid = await service.checkPayee({ headers, params, payload, proxy })
      if (notValid) {
        const getPartiesService = new services.GetPartiesService(deps)
        // todo: think, if we need to remove destination header before starting new discovery
        await getPartiesService.handleRequest({ headers, params, results })
        log.info('putPartiesErrorByTypeAndID triggered new discovery flow')
        histTimerEnd({ success: true })
        return
      }

      const isLast = await service.checkLastProxyCallback({ destination, proxy, params })
      if (!isLast) {
        log.info('putPartiesErrorByTypeAndID proxy callback was processed', { proxy })
        histTimerEnd({ success: true })
        return
      }
    }

    const sendTo = await service.identifyDestinationForErrorCallback(destination)
    results.requester = sendTo
    await service.sendErrorCallbackToParticipant({ sendTo, headers, params, dataUri })

    log.info('putPartiesErrorByTypeAndID callback was sent', { sendTo })
    histTimerEnd({ success: true })
  } catch (error) {
    const { requester } = results
    results.fspiopError = await service.handleError({ error, requester, headers, params })
    if (results.fspiopError) {
      libUtil.countFspiopError(results.fspiopError, { operation: component, step: stepState.step })
    }
    histTimerEnd({ success: false })
  } finally {
    await libUtil.finishSpanWithError(childSpan, results.fspiopError)
  }
}

module.exports = {
  putPartiesByTypeAndID,
  putPartiesErrorByTypeAndID
}
