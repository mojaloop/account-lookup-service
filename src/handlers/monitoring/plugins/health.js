/*****
 LICENSE

 Copyright © 2020 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0
 (the "License") and you may not use these files except in compliance with the [License](http://www.apache.org/licenses/LICENSE-2.0).

 You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 either express or implied. See the License for the specific language governing permissions and limitations under the [License](http://www.apache.org/licenses/LICENSE-2.0).

 * Infitx
 - Steven Oderayi <steven.oderayi@infitx.com>
--------------
******/

'use strict'

const { HealthCheck } = require('@mojaloop/central-services-shared').HealthCheck
const { defaultHealthHandler } = require('@mojaloop/central-services-health')
const { getProxyCacheHealth } = require('../../../lib/healthCheck/subServiceHealth')
const packageJson = require('../../../../package.json')

let healthCheck

const createHealthCheck = ({ proxyCache }) => {
  return new HealthCheck(packageJson, [
    () => getProxyCacheHealth(proxyCache)
  ])
}

const handler = {
  get: (request, reply) => {
    const proxyCache = request.server.app.proxyCache
    healthCheck = healthCheck || createHealthCheck({ proxyCache })
    return defaultHealthHandler(healthCheck)(request, reply)
  }
}

const routes = [
  {
    method: 'GET',
    path: '/health',
    handler: handler.get
  }
]

const plugin = {
  name: 'Health',
  register (server) {
    server.route(routes)
  }
}

module.exports = {
  plugin,
  handler,
  createHealthCheck
}
