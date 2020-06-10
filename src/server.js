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

const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const Path = require('path')
const Db = require('./lib/db')
const Config = require('./lib/config.js')
const Plugins = require('./plugins')
const RequestLogger = require('./lib/requestLogger')
const ParticipantEndpointCache = require('@mojaloop/central-services-shared').Util.Endpoints
const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend
const HeaderValidator = require('@mojaloop/central-services-shared').Util.Hapi.FSPIOPHeaderValidation
const Migrator = require('./lib/migrator')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const Handlers = require('./handlers')

const connectDatabase = async () => {
  return Db.connect(Config.DATABASE)
}

const migrate = async () => {
  return Config.RUN_MIGRATIONS ? Migrator.migrate() : {}
}

/**
 * @function createServer
 *
 * @description Create HTTP Server
 *
 * @param {number} port Port to register the Server against
 * @param {object} api to check if admin or api server
 * @returns {Promise<Server>} Returns the Server object
 */
const createServer = async (port, api) => {
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
  await Plugins.registerPlugins(server, api)
  await server.register([
    {
      plugin: HeaderValidator
    }
  ])
  await server.ext([
    {
      type: 'onRequest',
      method: (request, h) => {
        RequestLogger.logRequest(request)
        return h.continue
      }
    },
    {
      type: 'onPreResponse',
      method: (request, h) => {
        RequestLogger.logResponse(request.response)
        return h.continue
      }
    }
  ])

  // use as a catch-all handler
  server.route({
    method: ['GET', 'POST', 'PUT', 'DELETE'],
    path: '/{path*}',
    handler: (req, h) => {
      return api.handleRequest(
        {
          method: req.method,
          path: req.path,
          body: req.payload,
          query: req.query,
          headers: req.headers
        },
        req,
        h
      )
      // TODO: follow instructions https://github.com/anttiviljami/openapi-backend/blob/master/DOCS.md#postresponsehandler-handler
    }
  })

  await server.start()
  return server
}

const initializeApi = async (port = Config.API_PORT) => {
  await connectDatabase()
  const api = await OpenapiBackend.initialise(Path.resolve(__dirname, './interface/api-swagger.yaml'), Handlers.ApiHandlers)
  const server = await createServer(port, api)
  Logger.info(`Server running on ${server.info.host}:${server.info.port}`)
  await ParticipantEndpointCache.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
  return server
}

const initializeAdmin = async (port = Config.ADMIN_PORT) => {
  await connectDatabase()
  await migrate()
  const api = await OpenapiBackend.initialise(Path.resolve(__dirname, './interface/admin-swagger.yaml'), Handlers.AdminHandlers)
  const server = await createServer(port, api)
  Logger.info(`Server running on ${server.info.host}:${server.info.port}`)
  return server
}

module.exports = {
  initializeApi,
  initializeAdmin
}
