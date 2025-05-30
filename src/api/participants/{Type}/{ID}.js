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
 * Juan Correa <juan.correa@modusbox.com>

 --------------
 ******/
'use strict'

const Enum = require('@mojaloop/central-services-shared').Enum
const EventFrameworkUtil = require('@mojaloop/central-services-shared').Util.EventFramework
const EventSdk = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')
const LibUtil = require('../../../lib/util')
const participants = require('../../../domain/participants')

/**
 * Operations on /participants/{Type}/{ID}
 */
module.exports = {
  /**
   * summary: ParticipantsByTypeAndID
   * description: The HTTP request GET /participants/&lt;Type&gt;/&lt;ID&gt; (or GET /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to find out in which FSP the requested Party, defined by &lt;Type&gt;, &lt;ID&gt; and optionally &lt;SubId&gt;, is located (for example, GET /participants/MSISDN/123456789, or GET /participants/BUSINESS/shoecompany/employee1). This HTTP request should support a query string for filtering of currency. To use filtering of currency, the HTTP request GET /participants/&lt;Type&gt;/&lt;ID&gt;?currency=XYZ should be used, where XYZ is the requested currency.
   * parameters: Accept
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */
  get: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_getParticipantsByTypeAndID',
      'Ingress: Get participant by Type and Id',
      ['success']
    ).startTimer()

    const { headers, payload, method, path, params, span } = request
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PARTICIPANT, Enum.Events.Event.Action.GET)
    span.setTags(spanTags)
    const queryTags = EventFrameworkUtil.Tags.getQueryTags(
      Enum.Tags.QueryTags.serviceName.accountLookupService,
      Enum.Tags.QueryTags.auditType.partyOnboarding,
      Enum.Tags.QueryTags.contentType.httpRequest,
      Enum.Tags.QueryTags.operation.getParticipantsByTypeAndID,
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

    const metadata = `${request.method} ${request.path}`
    participants.getParticipantsByTypeAndID(request.headers, request.params, request.method, request.query, span, request.server.app.cache).catch(err => {
      request.server.log(['error'], `ERROR - getParticipantsByTypeAndID:${metadata}: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })

    return h.response().code(202)
  },
  /**
   * summary: ParticipantsByTypeAndID
   * description: The callback PUT /participants/&lt;Type&gt;/&lt;ID&gt; (or PUT /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the lookup, creation, or deletion of the FSP information related to the Party. If the FSP information is deleted, the fspId element should be empty; otherwise the element should include the FSP information for the Party.
   * parameters: body, Content-Length
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  put: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_putParticipantsByTypeAndID',
      'Ingress: Put participant by Type and Id',
      ['success']
    ).startTimer()
    const metadata = `${request.method} ${request.path}`

    const { headers, payload, method, path, params, span } = request
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PARTICIPANT, Enum.Events.Event.Action.PUT)
    span.setTags(spanTags)
    const queryTags = EventFrameworkUtil.Tags.getQueryTags(
      Enum.Tags.QueryTags.serviceName.accountLookupService,
      Enum.Tags.QueryTags.auditType.partyOnboarding,
      Enum.Tags.QueryTags.contentType.httpRequest,
      Enum.Tags.QueryTags.operation.putParticipantsByTypeAndID,
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

    participants.putParticipantsByTypeAndID(request.headers, request.params, request.method, request.payload, request.server.app.cache).catch(err => {
      request.server.log(['error'], `ERROR - putParticipantsByTypeAndID:${metadata}: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })
    return h.response().code(200)
  },
  /**
   * summary: ParticipantsByIDAndType
   * description: The HTTP request POST /participants/&lt;Type&gt;/&lt;ID&gt; (or POST /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to create information in the server regarding the provided identity, defined by &lt;Type&gt;, &lt;ID&gt;, and optionally &lt;SubId&gt; (for example, POST /participants/MSISDN/123456789 or POST /participants/BUSINESS/shoecompany/employee1).
   * parameters: body, Accept, Content-Length
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */
  post: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_postParticipantsbyTypeAndID',
      'Ingress: Post participant by Type and Id',
      ['success']
    ).startTimer()
    const { method, path, params, span } = request
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PARTICIPANT, Enum.Events.Event.Action.POST)
    span.setTags(spanTags)
    const queryTags = EventFrameworkUtil.Tags.getQueryTags(
      Enum.Tags.QueryTags.serviceName.accountLookupService,
      Enum.Tags.QueryTags.auditType.partyOnboarding,
      Enum.Tags.QueryTags.contentType.httpRequest,
      Enum.Tags.QueryTags.operation.postParticipantsByTypeAndID,
      {
        httpMethod: method,
        httpPath: path,
        partyIdType: params.Type,
        partyIdentifier: params.ID
      }
    )
    span.setTags(queryTags)
    await span.audit({
      headers: request.headers,
      payload: request.payload
    }, EventSdk.AuditEventAction.start)
    const metadata = `${request.method} ${request.path}`
    participants.postParticipants(request.headers, request.method, request.params, request.payload, span, request.server.app.cache).catch(err => {
      request.server.log(['error'], `ERROR - postParticipants:${metadata}: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })
    return h.response().code(202)
  },
  /**
   * summary: ParticipantsByTypeAndID
   * description: The HTTP request DELETE /participants/&lt;Type&gt;/&lt;ID&gt; (or DELETE /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to delete information in the server regarding the provided identity, defined by &lt;Type&gt; and &lt;ID&gt;) (for example, DELETE /participants/MSISDN/123456789), and optionally &lt;SubId&gt;. This HTTP request should support a query string to delete FSP information regarding a specific currency only. To delete a specific currency only, the HTTP request DELETE /participants/&lt;Type&gt;/&lt;ID&gt;?currency=XYZ should be used, where XYZ is the requested currency. Note -  The Account Lookup System should verify that it is the Party’s current FSP that is deleting the FSP information.
   * parameters: Accept
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */
  delete: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_deleteParticipantsByTypeAndID',
      'Ingress: Delete participant by Type and Id',
      ['success']
    ).startTimer()

    const { headers, method, path, params, span } = request
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PARTICIPANT, Enum.Events.Event.Action.DELETE)
    span.setTags(spanTags)
    const queryTags = EventFrameworkUtil.Tags.getQueryTags(
      Enum.Tags.QueryTags.serviceName.accountLookupService,
      Enum.Tags.QueryTags.auditType.partyOnboarding,
      Enum.Tags.QueryTags.contentType.httpRequest,
      Enum.Tags.QueryTags.operation.deleteParticipantsByTypeAndID,
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
      payload: undefined
    }, EventSdk.AuditEventAction.start)

    const metadata = `${request.method} ${request.path}`
    participants.deleteParticipants(request.headers, request.params, request.method, request.query, request.server.app.cache).catch(err => {
      request.server.log(['error'], `ERROR - deleteParticipants:${metadata}: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })
    return h.response().code(202)
  }
}
