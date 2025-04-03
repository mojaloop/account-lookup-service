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

 --------------
 ******/
'use strict'

const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const Metrics = require('@mojaloop/central-services-metrics')
const { Endpoints, Participants, proxies, OpenapiBackend } = require('@mojaloop/central-services-shared').Util
const { createProxyCache } = require('@mojaloop/inter-scheme-proxy-cache-lib')

const { name, version } = require('../package.json')
const { logger } = require('./lib')
const Db = require('./lib/db')
const Util = require('./lib/util')
const Plugins = require('./plugins')
const Migrator = require('./lib/migrator')
const APIHandlers = require('./api')
const Routes = require('./api/routes')
const Cache = require('./lib/cache')
const OracleEndpointCache = require('./models/oracle/oracleEndpointCached')
const Handlers = require('./handlers/register')

const connectDatabase = async (dbConfig) => {
  await Db.connect(dbConfig)
  logger.info('Database connected')
}

const initOpenApiBackend = async ({ isAdmin }) => {
  const OpenAPISpecPath = Util.pathForInterface({ isAdmin, isMockInterface: false })
  const apiHandlers = isAdmin
    ? APIHandlers.AdminHandlers
    : APIHandlers.ApiHandlers
  const api = await OpenapiBackend.initialise(OpenAPISpecPath, apiHandlers)
  logger.verbose('OpenAPI Backend initialized', { isAdmin })
  return api
}

const migrate = async () => {
  return Migrator.migrate()
}

const createConnectedProxyCache = async (proxyCacheConfig) => {
  const proxyCache = createProxyCache(
    proxyCacheConfig.type,
    proxyCacheConfig.proxyConfig
  )
  const connStatus = await proxyCache.connect()
  logger.info('proxyCache connected', { connStatus, proxyCacheConfig })
  return proxyCache
}

/**
 * @function createServer
 *
 * @description Create HTTP Server
 *
 * @param {number} port Port to register the Server against
 * @param {object} api to check if admin or api server
 * @param {array} routes array of API routes
 * @returns {Promise<Server>} Returns the Server object
 */
const createServer = async (port, api, routes, isAdmin, proxyCacheConfig) => {
  const server = await new Hapi.Server({
    port,
    routes: {
      validate: {
        options: ErrorHandler.validateRoutes(),
        failAction: async (request, h, err) => {
          throw Boom.boomify(err)
        }
      },
      payload: {
        parse: true,
        output: 'stream'
      }
    }
  })
  server.app.isAdmin = isAdmin

  server.app.cache = Cache.registerCacheClient({
    id: 'serverGeneralCache',
    preloadCache: async () => Promise.resolve()
  })

  if (!isAdmin && proxyCacheConfig.enabled) {
    server.app.proxyCache = await createConnectedProxyCache(proxyCacheConfig)
  }

  await Plugins.registerPlugins(server, api, isAdmin)

  server.route(routes)

  // TODO: follow instructions https://github.com/anttiviljami/openapi-backend/blob/master/DOCS.md#postresponsehandler-handler
  await server.start()

  Logger.isInfoEnabled && Logger.info(`${name}${isAdmin ? '-admin' : ''}@${version} is running on port ${server.info.port}...`)
  return server
}

const initializeInstrumentation = (metricsConfig) => {
  Metrics.setup(metricsConfig)
}

const initializeApi = async (appConfig) => {
  const {
    INSTRUMENTATION_METRICS_DISABLED,
    INSTRUMENTATION_METRICS_CONFIG,
    CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG,
    CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG,
    DATABASE,
    API_PORT,
    PROXY_CACHE_CONFIG
  } = appConfig

  if (!INSTRUMENTATION_METRICS_DISABLED) {
    if (INSTRUMENTATION_METRICS_CONFIG.defaultLabels) {
      INSTRUMENTATION_METRICS_CONFIG.defaultLabels.serviceVersion = version
    }
    initializeInstrumentation(INSTRUMENTATION_METRICS_CONFIG)
  }
  await connectDatabase(DATABASE)
  const api = await initOpenApiBackend({ isAdmin: false })

  await Promise.all([
    Endpoints.initializeCache(CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG, Util.hubNameConfig),
    Participants.initializeCache(CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG, Util.hubNameConfig),
    proxies.initializeCache(CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG, Util.hubNameConfig),
    OracleEndpointCache.initialize(),
    Cache.initCache()
  ])
  logger.verbose('all caches initialized')

  return createServer(API_PORT, api, Routes.APIRoutes(api), false, PROXY_CACHE_CONFIG)
}

const initializeAdmin = async (appConfig) => {
  const {
    INSTRUMENTATION_METRICS_DISABLED,
    INSTRUMENTATION_METRICS_CONFIG,
    DATABASE,
    RUN_MIGRATIONS,
    ADMIN_PORT,
    PROXY_CACHE_CONFIG
  } = appConfig

  if (!INSTRUMENTATION_METRICS_DISABLED) {
    initializeInstrumentation(INSTRUMENTATION_METRICS_CONFIG)
  }
  await connectDatabase(DATABASE)
  RUN_MIGRATIONS && await migrate()
  const api = await initOpenApiBackend({ isAdmin: true })

  await Promise.all([
    OracleEndpointCache.initialize(),
    Cache.initCache()
  ])
  return createServer(ADMIN_PORT, api, Routes.AdminRoutes(api), true, PROXY_CACHE_CONFIG)
}

const initializeHandlers = async (handlers, appConfig, logger) => {
  const proxyCache = await createConnectedProxyCache(appConfig.PROXY_CACHE_CONFIG)
  const options = { proxyCache, logger, batchSize: appConfig.HANDLERS_TIMEOUT_BATCH_SIZE }
  await Handlers.registerHandlers(handlers, options)
}

module.exports = {
  initializeApi,
  initializeAdmin,
  initializeHandlers
}
