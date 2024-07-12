/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/
'use strict'

const { randomUUID } = require('node:crypto')
const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const ParticipantEndpointCache = require('@mojaloop/central-services-shared').Util.Endpoints
const ParticipantCache = require('@mojaloop/central-services-shared').Util.Participants
const proxies = require('@mojaloop/central-services-shared').Util.proxies
const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const Metrics = require('@mojaloop/central-services-metrics')
const { createProxyCache } = require('@mojaloop/inter-scheme-proxy-cache-lib')

const Db = require('./lib/db')
const Util = require('./lib/util')
const Plugins = require('./plugins')
const RequestLogger = require('./lib/requestLogger')
const Migrator = require('./lib/migrator')
const Handlers = require('./handlers')
const Routes = require('./handlers/routes')
const Cache = require('./lib/cache')
const OracleEndpointCache = require('./models/oracle/oracleEndpointCached')

const connectDatabase = async (dbConfig) => {
  return Db.connect(dbConfig)
}

const migrate = async () => {
  return Migrator.migrate()
}

const createConnectedProxyCache = async (proxyCacheConfig) => {
  const proxyCache = createProxyCache(
    proxyCacheConfig.type,
    proxyCacheConfig.proxyConfig
  )
  await proxyCache.connect()
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
  server.app.cache = Cache.registerCacheClient({
    id: 'serverGeneralCache',
    preloadCache: async () => Promise.resolve()
  })

  if (!isAdmin && proxyCacheConfig.enabled) {
    server.app.proxyCache = await createConnectedProxyCache(proxyCacheConfig)
  }

  server.app.isAdmin = isAdmin

  await Plugins.registerPlugins(server, api, isAdmin)
  await server.ext([
    {
      type: 'onPostAuth',
      method: (request, h) => {
        request.headers.traceid = request.headers.traceid || randomUUID()
        RequestLogger.logRequest(request)
        return h.continue
      }
    },
    {
      type: 'onPreResponse',
      method: (request, h) => {
        RequestLogger.logResponse(request)
        return h.continue
      }
    }
  ])

  server.route(routes)
  // TODO: follow instructions https://github.com/anttiviljami/openapi-backend/blob/master/DOCS.md#postresponsehandler-handler
  await server.start()
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
    proxyCacheConfig
  } = appConfig

  if (!INSTRUMENTATION_METRICS_DISABLED) {
    initializeInstrumentation(INSTRUMENTATION_METRICS_CONFIG)
  }
  await connectDatabase(DATABASE)
  const OpenAPISpecPath = Util.pathForInterface({ isAdmin: false, isMockInterface: false })
  const api = await OpenapiBackend.initialise(OpenAPISpecPath, Handlers.ApiHandlers)
  const server = await createServer(API_PORT, api, Routes.APIRoutes(api), false, proxyCacheConfig)
  Logger.isInfoEnabled && Logger.info(`Server running on ${server.info.host}:${server.info.port}`)
  await ParticipantEndpointCache.initializeCache(CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG, Util.hubNameConfig)
  await ParticipantCache.initializeCache(CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG, Util.hubNameConfig)
  await proxies.initializeCache(CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG, Util.hubNameConfig)
  await OracleEndpointCache.initialize()
  await Cache.initCache()
  return server
}

const initializeAdmin = async (appConfig) => {
  const {
    INSTRUMENTATION_METRICS_DISABLED,
    INSTRUMENTATION_METRICS_CONFIG,
    DATABASE,
    RUN_MIGRATIONS,
    ADMIN_PORT,
    proxyCacheConfig
  } = appConfig

  if (!INSTRUMENTATION_METRICS_DISABLED) {
    initializeInstrumentation(INSTRUMENTATION_METRICS_CONFIG)
  }
  await connectDatabase(DATABASE)
  RUN_MIGRATIONS && await migrate()
  const OpenAPISpecPath = Util.pathForInterface({ isAdmin: true, isMockInterface: false })
  const api = await OpenapiBackend.initialise(OpenAPISpecPath, Handlers.AdminHandlers)
  const server = await createServer(ADMIN_PORT, api, Routes.AdminRoutes(api), true, proxyCacheConfig)
  Logger.isInfoEnabled && Logger.info(`Server running on ${server.info.host}:${server.info.port}`)
  return server
}

module.exports = {
  initializeApi,
  initializeAdmin
}
