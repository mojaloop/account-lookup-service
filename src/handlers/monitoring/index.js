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
const Hapi = require('@hapi/hapi')
const Metrics = require('@mojaloop/central-services-metrics')
const healthPlugin = require('./plugins/health').plugin
const { logger } = require('../../lib')

let server

const create = async ({ port, metricsConfig }) => {
  Metrics.setup(metricsConfig)
  server = new Hapi.Server({ port })
  await server.register([healthPlugin, Metrics.plugin])
}

const start = async ({ enabled, port, metricsConfig, proxyCache }) => {
  if (!enabled) return
  if (!server) await create({ port, metricsConfig })
  server.app.proxyCache = proxyCache
  await server.start()
  logger.info(`Monitoring server running at: ${server.info.uri}`)
}

const stop = async () => {
  await Promise.all([
    server.stop(),
    server.app.proxyCache?.disconnect()
  ])
  server = null
}

module.exports = {
  start,
  stop
}
