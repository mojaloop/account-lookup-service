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

const Logger = require('@mojaloop/central-services-logger')
const Util = require('util')

const logRequest = function (request) {
  const traceId = request.headers.traceid
  Logger.isDebugEnabled && Logger.debug(`ALS-Trace=${traceId} - Method: ${request.method} Path: ${request.path} Query: ${JSON.stringify(request.query)}`)
  Logger.isDebugEnabled && Logger.debug(`ALS-Trace=${traceId} - Headers: ${JSON.stringify(request.headers, null, 2)}`)
  if (request.payload) {
    Logger.isDebugEnabled && Logger.debug(`ALS-Trace=${traceId} - Body: ${JSON.stringify(request.payload, null, 2)}`)
  }
}

const logResponse = function (request) {
  if (Logger.isDebugEnabled && request.response) {
    const traceId = request.headers.traceid
    let response
    try {
      response = JSON.stringify(request.response, null, 2)
    } catch (e) {
      response = Util.inspect(request.response)
    }
    if (!response) {
      Logger.isDebugEnabled && Logger.debug(`ALS-Trace=${traceId} - Response: ${request.response}`)
    } else {
      Logger.isDebugEnabled && Logger.debug(`ALS-Trace=${traceId} - Status: ${request.response.statusCode || request.response.httpStatusCode}, Stack: ${request.response.stack}`)
    }
  }
}

module.exports = {
  logRequest,
  logResponse
}
