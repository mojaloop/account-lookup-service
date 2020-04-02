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

const Enum = require('@mojaloop/central-services-shared').Enum
const EventSdk = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')
const LibUtil = require('../lib/util')
const oracle = require('../domain/oracle')

/**
 * Operations on /oracles
 */
module.exports = {
  /**
   * summary: Get Oracles
   * description: The HTTP request GET /oracles is used to return the list of all oracle endpoints. There are optional fields for type and currency i.e. /admin/oracles?type=MSISDN&amp;currency=USD which can be used to get more filtered results or a specific entry
   * parameters: type, currency, accept, content-type, date
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  get: async (request, h) => {
    const histTimerEnd = Metrics.getHistogram(
      'oracles_get',
      'Get oracles',
      ['success']
    ).startTimer()
    const span = request.span
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.ORACLE, Enum.Events.Event.Action.LOOKUP)
    span.setTags(spanTags)
    await span.audit({
      headers: request.headers,
      query: request.query
    }, EventSdk.AuditEventAction.start)
    let response
    try {
      response = await oracle.getOracle(request.query)
      histTimerEnd({ success: true })
      return h.response(response).code(200)
    } catch (err) {
      histTimerEnd({ success: false })
      throw err
    }
  },
  /**
   * summary: Create Oracles
   * description: The HTTP request POST /oracles is used to create information in the server regarding the provided oracles. This request should be used for creation of Oracle information.
   * parameters: body, accept, content-length, content-type, date
   * produces: application/json
   * responses: 201, 400, 401, 403, 404, 405, 406, 501, 503
   */
  post: async (request, h) => {
    const histTimerEnd = Metrics.getHistogram(
      'oracles_put',
      'Put oracles',
      ['success']
    ).startTimer()
    const span = request.span
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.ORACLE, Enum.Events.Event.Action.POST)
    span.setTags(spanTags)
    await span.audit({
      headers: request.headers,
      payload: request.payload
    }, EventSdk.AuditEventAction.start)
    try {
      await oracle.createOracle(request.payload)
      histTimerEnd({ success: true })
      return h.response().code(201)
    } catch (err) {
      histTimerEnd({ success: false })
      throw err
    }
  }
}
