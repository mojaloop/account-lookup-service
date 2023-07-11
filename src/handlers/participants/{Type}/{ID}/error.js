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
 - Juan Correa <juan.correa@modusbox.com>

 --------------
 ******/
'use strict'

const Enum = require('@mojaloop/central-services-shared').Enum
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const EventSdk = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')
const LibUtil = require('../../../../lib/util')
const participants = require('../../../../domain/participants')

/**
 * Operations on /participants/{Type}/{ID}/error
 */
module.exports = {
  /**
   * summary: ParticipantsErrorByTypeAndID
   * description: If the server is unable to find, create or delete the associated FSP of the provided identity, or another processing error occurred, the error callback PUT /participants/&lt;Type&gt;/&lt;ID&gt;/error (or PUT /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;/error) is used.
   * parameters: Type, ID, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  put: async (context, request, h) => {
    const histTimerEnd = Metrics.getHistogram(
      'ing_putParticipantsErrorByTypeAndID',
      'Ingress: Put participant error by Type and Id',
      ['success']
    ).startTimer()
    const span = request.span
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.PARTICIPANT, Enum.Events.Event.Action.PUT)
    span.setTags(spanTags)
    const metadata = `${request.method} ${request.path}`
    try {
      await span.audit({
        headers: request.headers,
        payload: request.payload
      }, EventSdk.AuditEventAction.start)
      request.server.log(['info'], `received: ${metadata}. ${LibUtil.getStackOrInspect(request.params)}`)
      participants.putParticipantsErrorByTypeAndID(request.headers, request.params, request.payload, request.dataUri, span).catch(err => {
        request.server.log(['error'], `ERROR - putParticipantsErrorByTypeAndID:${metadata}: ${LibUtil.getStackOrInspect(err)}`)
      })
      request.server.log(['info'], `success: ${metadata}.`)
      histTimerEnd({ success: true })
    } catch (err) {
      request.server.log(['error'], `ERROR - ${metadata}: ${LibUtil.getStackOrInspect(err)}`)
      histTimerEnd({ success: false })
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
    return h.response().code(200)
  }
}
