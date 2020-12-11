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

const Config = require('./lib/config')
const Inert = require('@hapi/inert')
const Vision = require('@hapi/vision')
const Blipp = require('blipp')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const CentralServices = require('@mojaloop/central-services-shared')
const RawPayloadToDataUri = require('@mojaloop/central-services-shared').Util.Hapi.HapiRawPayload
const OpenapiBackendValidator = require('@mojaloop/central-services-shared').Util.Hapi.OpenapiBackendValidator
const APIDocumentation = require('@mojaloop/central-services-shared').Util.Hapi.APIDocumentation

const registerPlugins = async (server, openAPIBackend) => {
  await server.register(OpenapiBackendValidator)
  
  if (Config.API_DOC_ENDPOINTS_ENABLED) {
    await server.register({
      plugin: APIDocumentation,
      options: {
        document: openAPIBackend.document
      }
    })
  }

  await server.register({
    plugin: {
      name: 'openapi',
      version: '1.0.0',
      multiple: true,
      register: function (server, options) {
        server.expose('openapi', options.openapi)
      }
    },
    options: {
      openapi: openAPIBackend
    }
  })

  await server.register({
    plugin: require('@hapi/good'),
    options: {
      ops: {
        interval: 10000
      }
    }
  })

  await server.register({
    plugin: require('@hapi/basic')
  })

  await server.register({
    plugin: require('@now-ims/hapi-now-auth')
  })

  await server.register({
    plugin: require('hapi-auth-bearer-token')
  })

  await server.register([
    Inert,
    Vision,
    ErrorHandling,
    RawPayloadToDataUri,
    CentralServices.Util.Hapi.HapiEventPlugin
  ])

  if (Config.DISPLAY_ROUTES === true) {
    await server.register([Blipp])
  }
}

module.exports = {
  registerPlugins
}
