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
 * Name Surname <name.surname@gatesfoundation.com>

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/
'use strict'

const Enum = require('@mojaloop/central-services-shared').Enum
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
  get: function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_getPartiesByTypeIDAndSubID',
      'Ingress - Get party by Type, ID and SubId',
      ['success']
    ).startTimer()
    parties.getPartiesByTypeAndID(request.headers, request.params, request.method, request.query, request.span).catch(err => {
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
  put: function (context, request, h) {
    const histTimerEnd = Metrics.getHistogram(
      'ing_putPartiesByTypeIDAndSubID',
      'Ingress - Put parties by Type, ID and SubId',
      ['success']
    ).startTimer()
    parties.putPartiesByTypeAndID(request.headers, request.params, request.method, request.payload, request.dataUri).catch(err => {
      request.server.log(['error'], `ERROR - putPartiesByTypeAndID: ${LibUtil.getStackOrInspect(err)}`)
    })
    histTimerEnd({ success: true })
    return h.response().code(Enum.Http.ReturnCodes.OK.CODE)
  }
}
