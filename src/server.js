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
const ParticipantEndpointCache = require('./domain/participant/cache/participantEndpoint')

const connectDatabase = async () => {
  let result = await Db.connect(Config.DATABASE_URI)
  return result
}

const openAPIOptions = {
  api: Path.resolve(__dirname, './interface/swagger.json'),
  handlers: Path.resolve(__dirname, './handlers')
}

/**
 * @function createServer
 *
 * @description Create HTTP Server
 *
 * @param {number} port Port to register the Server against
 * @returns {Promise<Server>} Returns the Server object
 */
const createServer = async (port) => {
  const server = await new Hapi.Server({
    port
  })
  await Plugins.registerPlugins(server)
  await server.register([
    {
      plugin: HapiOpenAPI,
      options: openAPIOptions
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
          let errorMessage = {
            errorInformation: {
              errorCode: error.statusCode,
              errorDescription: error.message
            }
          }
          error.message = errorMessage
          error.reformat()
        }
        return h.continue
      }
    }
  ])
  await server.start()
  Logger.debug('Server running at: ', server.info.uri)
  return server
}

const initialize = async () => {
  await connectDatabase()
  const server = await createServer(Config.PORT)
  if (server) {
    try {
      server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
      server.log('info', `Server running on ${server.info.host}:${server.info.port}`)
      await ParticipantEndpointCache.initializeCache()
      return server
    } catch (e) {
      server.log('error', e.message)
    }
  }
}

module.exports = {
  initialize
}