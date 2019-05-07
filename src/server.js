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

const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Db = require('@mojaloop/central-services-database').Db
const Config = require('./lib/config.js')
const Logger = require('@mojaloop/central-services-shared').Logger
const Plugins = require('./plugins')
const RequestLogger = require('./lib/requestLogger')
const ParticipantEndpointCache = require('./models/participantEndpoint/participantEndpoint')
const Migrator = require('./lib/migrator')

const connectDatabase = async () => {
  return await Db.connect(Config.DATABASE_URI)
}

const openAPIOptions = {
  api: Path.resolve(__dirname, './interface/api_swagger.json'),
  handlers: Path.resolve(__dirname, './handlers')
}

const openAdminAPIOptions = {
  api: Path.resolve(__dirname, './interface/admin_swagger.json'),
  handlers: Path.resolve(__dirname, './handlers')
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
const createServer = async (port, isApi) => {
  const server = await new Hapi.Server({
    port
  })
  await Plugins.registerPlugins(server)
  await server.register([
    {
      plugin: HapiOpenAPI,
      options: isApi ? openAPIOptions : openAdminAPIOptions
    }
  ])
  await server.ext([
    {
      type: 'onPreHandler',
      method: (request, h) => {
        RequestLogger.logResponse(request)
        return h.continue
      }
    },
    {
      type: 'onPreResponse',
      method: (request, h) => {
        if (!request.response.isBoom) {
          RequestLogger.logResponse(request.response)
        } else {
          const error = request.response
          error.message = {
            errorInformation: {
              errorCode: error.statusCode,
              errorDescription: error.message,
              extensionList:[{
                key: '',
                value: ''
              }]
            }
          }
          error.reformat()
        }
        return h.continue
      }
    }
  ])
  await server.start()
  return server
}

const initialize = async (port = Config.API_PORT, isApi = true) => {
  await connectDatabase()
  await migrate(isApi)
  const server = await createServer(port, isApi)
  server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
  Logger.info(`Server running on ${server.info.host}:${server.info.port}`)
  if(isApi) {
    await ParticipantEndpointCache.initializeCache()
  }
  return server
}

module.exports = {
  initialize
}