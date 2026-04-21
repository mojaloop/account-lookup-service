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
 * Vijay Kumar Guthi <vijaya.guthi@infitx.com>

 --------------
 ******/
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { Jws } = require('@mojaloop/sdk-standard-components')
const JwsValidator = Jws.validator

const Inert = require('@hapi/inert')
const Vision = require('@hapi/vision')
const Blipp = require('blipp')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const MetricsPlugin = require('@mojaloop/central-services-metrics').plugin
const {
  APIDocumentation,
  FSPIOPHeaderValidation,
  HapiEventPlugin,
  HapiRawPayload,
  OpenapiBackendValidator,
  loggingPlugin
} = require('@mojaloop/central-services-shared').Util.Hapi

const { logger } = require('./lib')
const Config = require('./lib/config')

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

  if (Config.JWS_VALIDATE) {
    const validationKeys = loadJwsKeys(Config.JWS_VERIFICATION_KEYS_DIRECTORY)
    const jwsValidator = new JwsValidator({ logger, validationKeys })
    const validatePutParties = Config.JWS_VALIDATE_PUT_PARTIES

    const watcher = watchJwsKeys(Config.JWS_VERIFICATION_KEYS_DIRECTORY, validationKeys)
    if (watcher) {
      server.app.jwsKeyWatcher = watcher
      server.events.on('stop', () => watcher.close())
    }

    server.ext('onPostAuth', (request, h) => {
      if (request.method === 'get') return h.continue

      const resource = request.path.replace(/^\//, '').split('/')[0]
      if (!['participants', 'parties'].includes(resource)) return h.continue

      if (!validatePutParties && request.method === 'put' && request.path.startsWith('/parties/')) {
        return h.continue
      }

      try {
        jwsValidator.validate({ headers: request.headers, body: request.payload })
      } catch (err) {
        logger.error('Inbound request failed JWS validation', err)
        throw ErrorHandling.Factory.createFSPIOPError(
          ErrorHandling.Enums.FSPIOPErrorCodes.INVALID_SIGNATURE, err.message
        )
      }
      return h.continue
    })
  }

  if (Config.DISPLAY_ROUTES === true) {
    await server.register([Blipp])
  }

  await server.register({
    plugin: loggingPlugin,
    options: { log: logger }
  })
}

const loadJwsKeys = (dir) => {
  const keys = {}
  if (!dir || !fs.existsSync(dir)) return keys
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.pem'))) {
    keys[path.basename(f, '.pem')] = fs.readFileSync(path.join(dir, f))
  }
  return keys
}

const watchJwsKeys = (dir, keyMap) => {
  if (!dir || !fs.existsSync(dir)) return null
  return fs.watch(dir, async (eventType, filename) => {
    if (!filename || path.extname(filename) !== '.pem') return
    const keyName = path.basename(filename, '.pem')
    const keyPath = path.join(dir, filename)
    try {
      if (fs.existsSync(keyPath)) {
        keyMap[keyName] = await fs.promises.readFile(keyPath)
        logger.info(`JWS verification key loaded: ${keyName}`)
      } else {
        delete keyMap[keyName]
        logger.info(`JWS verification key removed: ${keyName}`)
      }
    } catch (err) {
      logger.error(`Failed to process JWS key change for ${filename}`, err)
    }
  })
}

module.exports = {
  registerPlugins
}
