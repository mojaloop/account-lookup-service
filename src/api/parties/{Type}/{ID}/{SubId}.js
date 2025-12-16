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
 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/
'use strict'

const Enum = require('@mojaloop/central-services-shared').Enum
const EventFrameworkUtil = require('@mojaloop/central-services-shared').Util.EventFramework
const EventSdk = require('@mojaloop/event-sdk')
const LibUtil = require('../../../../lib/util')
const parties = require('../../../../domain/parties')
const Metrics = require('@mojaloop/central-services-metrics')

/**
 * Operations on /parties/{Type}/{ID}/{SubId}
 */
module.exports = {
  /**
   * summary: PartiesSubIdByTypeAndID
   * description: The HTTP request GET /parties/&lt;Type&gt;/&lt;ID&gt; (or GET /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to lookup information regarding the requested Party, defined by &lt;Type&gt;, &lt;ID&gt; and optionally &lt;SubId&gt; (for example, GET /parties/MSISDN/123456789, or GET /parties/BUSINESS/shoecompany/employee1).
   * parameters: Accept
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */
  get: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_getPartiesByTypeIDAndSubID',
      'Ingress - Get party by Type, ID and SubId',
      ['success']
    ).startTimer()
    const { proxyCache } = request.server.app

    const { headers, payload, method, path, params, span } = request
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PARTY, Enum.Events.Event.Action.GET)
    span.setTags(spanTags)
    const queryTags = EventFrameworkUtil.Tags.getQueryTags(
      Enum.Tags.QueryTags.serviceName.accountLookupService,
      Enum.Tags.QueryTags.auditType.transactionFlow,
      Enum.Tags.QueryTags.contentType.httpRequest,
      Enum.Tags.QueryTags.operation.getPartiesByTypeIDAndSubID,
      {
        httpMethod: method,
        httpPath: path,
        partyIdType: params.Type,
        partyIdentifier: params.ID,
        partySubIdOrType: params.SubId
      }
    )
    span.setTags(queryTags)
    await span.audit({
      headers,
      payload
    }, EventSdk.AuditEventAction.start)

    parties.getPartiesByTypeAndID(request.headers, request.params, request.method, request.query, request.span, proxyCache).catch(err => {
      request.server.log(['error'], `ERROR - getPartiesByTypeAndID: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })
    return h.response().code(Enum.Http.ReturnCodes.ACCEPTED.CODE)
  },
  /**
   * summary: PartiesSubIdByTypeAndID
   * description: The callback PUT /parties/&lt;Type&gt;/&lt;ID&gt; (or PUT /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the Party information lookup.
   * parameters: body, Content-Length
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  put: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_putPartiesByTypeIDAndSubID',
      'Ingress - Put parties by Type, ID and SubId',
      ['success']
    ).startTimer()
    const { proxyCache } = request.server.app

    const { headers, payload, method, path, params, span } = request
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PARTY, Enum.Events.Event.Action.PUT)
    span.setTags(spanTags)
    const queryTags = EventFrameworkUtil.Tags.getQueryTags(
      Enum.Tags.QueryTags.serviceName.accountLookupService,
      Enum.Tags.QueryTags.auditType.transactionFlow,
      Enum.Tags.QueryTags.contentType.httpRequest,
      Enum.Tags.QueryTags.operation.putPartiesByTypeIDAndSubID,
      {
        httpMethod: method,
        httpPath: path,
        partyIdType: params.Type,
        partyIdentifier: params.ID,
        partySubIdOrType: params.SubId
      }
    )
    span.setTags(queryTags)
    await span.audit({
      headers,
      payload
    }, EventSdk.AuditEventAction.start)

    parties.putPartiesByTypeAndID(request.headers, request.params, request.method, request.payload, request.dataUri, proxyCache).catch(err => {
      request.server.log(['error'], `ERROR - putPartiesByTypeAndID: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })
    return h.response().code(Enum.Http.ReturnCodes.OK.CODE)
  }
}
