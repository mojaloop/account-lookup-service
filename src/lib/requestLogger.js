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

const { logger, asyncStorage } = require('./index')

const logRequest = function (request) {
  const { path, method, headers, payload, query } = request
  const requestId = request.info.id = `${request.info.id}__${headers.traceid}`
  asyncStorage.enterWith({ requestId })

  logger.isInfoEnabled && logger.info(`[==> req] ${method.toUpperCase()} ${path}`, { headers, payload, query })
}

const logResponse = function (request) {
  if (logger.isInfoEnabled) {
    const { path, method, headers, payload, query, response } = request
    const { received } = request.info

    const statusCode = response instanceof Error
      ? response.output?.statusCode
      : response.statusCode
    const respTimeSec = ((Date.now() - received) / 1000).toFixed(3)

    logger.info(`[<== ${statusCode}][${respTimeSec} s] ${method.toUpperCase()} ${path}`, { headers, payload, query })
  }
}

module.exports = {
  logRequest,
  logResponse
}
