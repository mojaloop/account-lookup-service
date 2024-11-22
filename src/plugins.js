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
 * Vijay Kumar Guthi <vijaya.guthi@infitx.com>

 --------------
 ******/
'use strict'

const { randomUUID } = require('node:crypto')
const Inert = require('@hapi/inert')
const Vision = require('@hapi/vision')
const Blipp = require('blipp')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const {
  APIDocumentation,
  FSPIOPHeaderValidation,
  HapiEventPlugin,
  HapiRawPayload,
  OpenapiBackendValidator
} = require('@mojaloop/central-services-shared').Util.Hapi

const Config = require('./lib/config')
const MetricsPlugin = require('@mojaloop/central-services-metrics').plugin
const RequestLogger = require('./lib/requestLogger')

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

  if (!Config.INSTRUMENTATION_METRICS_DISABLED) {
    await server.register({
      plugin: MetricsPlugin
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

  // Helper to construct FSPIOPHeaderValidation option configuration
  const getOptionsForFSPIOPHeaderValidation = () => {
    // configure supported FSPIOP Content-Type versions
    const supportedProtocolContentVersions = []
    for (const version of Config.PROTOCOL_VERSIONS.CONTENT.VALIDATELIST) {
      supportedProtocolContentVersions.push(version.toString())
    }

    // configure supported FSPIOP Accept version
    const supportedProtocolAcceptVersions = []
    for (const version of Config.PROTOCOL_VERSIONS.ACCEPT.VALIDATELIST) {
      supportedProtocolAcceptVersions.push(version.toString())
    }

    // configure FSPIOP resources
    const resources = [
      'participants',
      'parties'
    ]

    // return FSPIOPHeaderValidation plugin options
    return {
      resources,
      supportedProtocolContentVersions,
      supportedProtocolAcceptVersions,
      apiType: Config.API_TYPE
    }
  }

  await server.register([
    Inert,
    Vision,
    ErrorHandling,
    HapiRawPayload,
    HapiEventPlugin,
    {
      plugin: FSPIOPHeaderValidation.plugin,
      options: getOptionsForFSPIOPHeaderValidation()
    }
  ])

  if (Config.DISPLAY_ROUTES === true) {
    await server.register([Blipp])
  }

  await server.ext([
    {
      type: 'onRequest',
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
}

module.exports = {
  registerPlugins
}
