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
 * Name Surname <name.surname@mojaloop.io>

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/
'use strict'

const Enum = require('@mojaloop/central-services-shared').Enum
const EventFrameworkUtil = require('@mojaloop/central-services-shared').Util.EventFramework
const EventSdk = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')
const parties = require('../../../domain/parties')
const LibUtil = require('../../../lib/util')

/**
 * Operations on /parties/{Type}/{ID}
 */
module.exports = {
  /**
   * summary: getPartiesByTypeAndID
   * description: The HTTP request GET /parties/&lt;Type&gt;/&lt;ID&gt; (or GET /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to lookup information regarding the requested Party, defined by &lt;Type&gt;, &lt;ID&gt; and optionally &lt;SubId&gt; (for example, GET /parties/MSISDN/123456789, or GET /parties/BUSINESS/shoecompany/employee1).
   * parameters: Accept
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */
  get: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_getPartiesByTypeAndID',
      'Ingress - Get party by Type and Id',
      ['success']
    ).startTimer()
    const { headers, payload, method, path, params, query, span } = request
    const { cache, proxyCache } = request.server.app

    const spanTags = LibUtil.getSpanTags({ headers }, Enum.Events.Event.Type.PARTY, Enum.Events.Event.Action.LOOKUP)
    span.setTags(spanTags)
    const queryTags = EventFrameworkUtil.Tags.getQueryTags(
      Enum.Tags.QueryTags.serviceName.accountLookupService,
      Enum.Tags.QueryTags.auditType.transactionFlow,
      Enum.Tags.QueryTags.contentType.httpRequest,
      Enum.Tags.QueryTags.operation.getPartiesByTypeAndID,
      {
        httpMethod: method,
        httpPath: path,
        partyIdType: params.Type,
        partyIdentifier: params.ID
      }
    )
    span.setTags(queryTags)
    await span.audit({
      headers,
      payload
    }, EventSdk.AuditEventAction.start)
    // Here we call an async function- but as we send an immediate sync response, _all_ errors
    // _must_ be handled by getPartiesByTypeAndID.
    parties.getPartiesByTypeAndID(headers, params, method, query, span, cache, proxyCache).catch(err => {
      request.server.log(['error'], `ERROR - getPartiesByTypeAndID: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })
    return h.response().code(202)
  },

  /**
   * summary: putPartiesByTypeAndID
   * description: The callback PUT /parties/&lt;Type&gt;/&lt;ID&gt; (or PUT /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the Party information lookup.
   * parameters: body, Content-Length
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  put: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_putPartiesByTypeAndID',
      'Ingress - Put party by Type and Id',
      ['success']
    ).startTimer()
    const { headers, payload, method, path, params, dataUri, span } = request
    const { cache, proxyCache } = request.server.app

    const spanTags = LibUtil.getSpanTags({ headers }, Enum.Events.Event.Type.PARTY, Enum.Events.Event.Action.PUT)
    span.setTags(spanTags)
    const queryTags = EventFrameworkUtil.Tags.getQueryTags(
      Enum.Tags.QueryTags.serviceName.accountLookupService,
      Enum.Tags.QueryTags.auditType.transactionFlow,
      Enum.Tags.QueryTags.contentType.httpRequest,
      Enum.Tags.QueryTags.operation.putPartiesByTypeAndID,
      {
        httpMethod: method,
        httpPath: path,
        partyIdType: params.Type,
        partyIdentifier: params.ID
      }
    )
    span.setTags(queryTags)
    await span.audit({
      headers,
      payload
    }, EventSdk.AuditEventAction.start)
    // Here we call an async function- but as we send an immediate sync response, _all_ errors
    // _must_ be handled by putPartiesByTypeAndID.
    parties.putPartiesByTypeAndID(headers, params, method, payload, dataUri, cache, proxyCache).catch(err => {
      request.server.log(['error'], `ERROR - putPartiesByTypeAndID: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })
    return h.response().code(200)
  }
}
