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

 * Juan Correa <juan.correa@modusbox.com>

 --------------
 ******/

'use strict'

const ParticipantEndpointCache = require('@mojaloop/central-services-shared').Util.Endpoints
const Config = require('../lib/config.js')
const Enum = require('@mojaloop/central-services-shared').Enum
const EventSdk = require('@mojaloop/event-sdk')
const LibUtil = require('../lib/util')

/**
 * Operations on /endpointcache
 */
module.exports = {
  /**
   * summary: DELETE Endpoint Cache
   * description: The HTTP request DELETE /endpointcache is used to reset the endpoint cache by performing an stopCache and initializeCache the Admin API.
   * parameters:
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */
  delete: async (request, h) => {
    const span = request.span
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PREPARE, Enum.Events.Event.Action.PREPARE)
    span.setTags(spanTags)
    await span.audit({
      headers: request.headers,
      payload: request.payload
    }, EventSdk.AuditEventAction.start)
    await ParticipantEndpointCache.stopCache()
    await ParticipantEndpointCache.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
    return h.response().code(202)
  }
}
