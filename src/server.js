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
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Db = require('./lib/db')
const Config = require('./lib/config.js')
const Logger = require('@mojaloop/central-services-shared').Logger
const Plugins = require('./plugins')
const RequestLogger = require('./lib/requestLogger')
const CSUtil = require('@mojaloop/central-services-shared').Util
const ParticipantEndpointCache = CSUtil.Endpoints
const Migrator = require('./lib/migrator')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Boom = require('@hapi/boom')
const models = require('./models')
const domain = require('./domain')
const Central = { ErrorHandler }
const HeaderValidator = require('./lib/validation')

const connectDatabase = async () => {
  await Db.connect(Config.DATABASE_URI)
}

const serviceType = {
  ADMIN: 'ADMIN',
  API: 'API'
}

const openAPIOptions = {
  [serviceType.API]: {
    api: Path.resolve(__dirname, './interface/api_swagger.json'),
    handlers: Path.resolve(__dirname, './handlers')
  },
  [serviceType.ADMIN]: {
    api: Path.resolve(__dirname, './interface/admin_swagger.json'),
    handlers: Path.resolve(__dirname, './handlers')
  }
}

const migrate = async (isApi) => {
  return Config.RUN_MIGRATIONS && !isApi ? await Migrator.migrate() : {}
}

/**
 * @function createServer
 *
 * @description Create HTTP Server
 *
 * @param {number} port Port to register the Server against
 * @param {boolean} isApi to check if admin or api server
 * @returns {Promise<Server>} Returns the Server object
 */
const createServer = async (port, service, app) => {
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
  await Plugins.registerPlugins(server)
  await server.register([
    {
      plugin: HapiOpenAPI,
      options: openAPIOptions[service]
    }
  ])
  await server.ext([
    {
      type: 'onPreHandler',
      method: (request, h) => {
        // Perform content-type and accept header validation on API routes- not on admin routes,
        // and not on the health endpoint. Note that hapi-openapi does not correctly validate
        // headers on routes where the headers are specified at the path level, instead of the
        // method level. And does not _appear_ to correctly validate the content of `string` +
        // `pattern` headers at all, although the accuracy of this statement has not been
        // thoroughly tested.
        if (service !== serviceType.API || request.path === '/health') {
          return h.continue;
        }

        // Always validate the accept header for a get request, or optionally if it has been
        // supplied
        if (request.method.toLowerCase() === 'get' || request.headers['accept']) {
          const accept = HeaderValidator.parseAcceptHeader(request.path, request.headers['accept'])
          if (!accept.valid) {
            throw Boom.badRequest('Invalid accept header')
          }
          const supportedApiVersions = ['1', '1.0', HeaderValidator.anyVersion]
          if (!supportedApiVersions.some(supportedVer => accept.versions.has(supportedVer))) {
            throw Boom.badRequest('Unacceptable version requested')
            // TODO: we should really be doing something like one of the following, but hapi
            // doesn't like it for some reason. Similarly elsewhere we throw a Boom error.
            // throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.UNACCEPTABLE_VERSION)
            // return h.response(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.UNACCEPTABLE_VERSION))
            // return h.response(ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.UNACCEPTABLE_VERSION).toApiErrorObject()).code(406).takeover()
          }
        }

        // Always validate the content-type header
        const contentType = HeaderValidator.parseContentTypeHeader(request.path,
          request.headers['content-type'])
        if (!contentType.valid) {
          throw Boom.badRequest('Invalid content-type header')
        }
        RequestLogger.logResponse(request, app.logger)
        return h.continue
      }
    },
    {
      type: 'onPreHandler',
      method: (request, h) => {
        RequestLogger.logResponse(request, app.logger)
        return h.continue
      }
    },
    {
      type: 'onPreResponse',
      method: (request, h) => {
        RequestLogger.logResponse(request.response, app.logger)
        return h.continue
      }
    }
  ])
  server.app = app
  return server
}

const initialize = async (port = Config.API_PORT, service, logger = Logger) => {
  await connectDatabase()
  await migrate(service === serviceType.API)
  const server = await createServer(port, service, {
    models,
    domain,
    logger,
    Central
  })
  await server.start()
  server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
  server.app.logger.info(`Server running on ${server.info.host}:${server.info.port}`)
  if (service === serviceType.API) {
    await ParticipantEndpointCache.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
  }
  return server
}

module.exports = {
  initialize,
  createServer,
  service: serviceType
}
