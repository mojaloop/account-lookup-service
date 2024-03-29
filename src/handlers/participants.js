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
 - Name Surname <name.surname@gatesfoundation.com>

 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 *****/
'use strict'

const Enum = require('@mojaloop/central-services-shared').Enum
const EventSdk = require('@mojaloop/event-sdk')
const LibUtil = require('../lib/util')
const participants = require('../domain/participants')
const Metrics = require('@mojaloop/central-services-metrics')

/**
 * Operations on /participants
 */
module.exports = {
  /**
   * summary: Participants
   * description: The HTTP request POST /participants is used to create information in the server regarding the provided list of identities. This request should be used for bulk creation of FSP information for more than one Party. The optional currency parameter should indicate that each provided Party supports the currency
   * parameters: body, Accept, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
   * produces: application/json
   * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
   */
  post: async function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_postParticipantsBatch',
      'Ingress: Post participants batch',
      ['success']
    ).startTimer()
    const span = request.span
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PARTICIPANT, Enum.Events.Event.Action.POST)
    span.setTags(spanTags)
    await span.audit({
      headers: request.headers,
      payload: request.payload
    }, EventSdk.AuditEventAction.start)
    // Here we call an async function- but as we send an immediate sync response, _all_ errors
    // _must_ be handled by postParticipantsBatch.
    participants.postParticipantsBatch(request.headers, request.method, request.payload, span)
    histTimerEnd({ success: true })
    return h.response().code(200)
  }
}
