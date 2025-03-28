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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Steven Oderayi <steven.oderayi@mousbox.com>
 * Shashikant Hirugade <shashikant.hirugade@mousbox.com>

 --------------
 ******/

'use strict'

const HealthCheck = require('@mojaloop/central-services-shared').HealthCheck.HealthCheck
const { getSubServiceHealthDatastore, getProxyCacheHealth } = require('../lib/healthCheck/subServiceHealth')
const packageJson = require('../../package.json')
const Config = require('../lib/config')

const getSubServices = (appConfig, isAdmin) => {
  if (isAdmin) {
    return [getSubServiceHealthDatastore]
  }

  const subServices = [getSubServiceHealthDatastore]
  if (appConfig.PROXY_CACHE_CONFIG.enabled) {
    subServices.push(getProxyCacheHealth)
  }
  return subServices
}

const healthCheck = new HealthCheck(packageJson, [])

/**
 * Operations on /health
 */
module.exports = {
  /**
   * summary: Get Oracles
   * description: The HTTP request GET /health is used to return the current status of the API .
   * parameters:
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  get: async (context, request, h) => {
    const { isAdmin, proxyCache } = request.server.app
    healthCheck.serviceChecks = getSubServices(Config, isAdmin)
    const health = await healthCheck.getHealth(proxyCache)
    const statusCode = health.status !== 'OK' ? 503 : 200
    return h.response(health).code(statusCode)
  }
}
