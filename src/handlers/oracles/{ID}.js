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

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Enum = require('@mojaloop/central-services-shared').Enum
const EventSdk = require('@mojaloop/event-sdk')
const Logger = require('@mojaloop/central-services-logger')
const Metrics = require('@mojaloop/central-services-metrics')
const LibUtil = require('../../lib/util')
const oracle = require('../../domain/oracle')

/**
 * Operations on /oracles/{ID}
 */
module.exports = {
  /**
   * summary: Update Oracle
   * description: The HTTP request PUT /oracles/{ID} is used to update information in the server regarding the provided oracle. This request should be used for individual update of Oracle information.
   * parameters: body, ID, content-length, content-type, date
   * produces: application/json
   * responses: 204, 400, 401, 403, 404, 405, 406, 501, 503
   */
  put: async (request, h) => {
    const histTimerEnd = Metrics.getHistogram(
      'oracle_put',
      'Update oracle details by Id',
      ['success']
    ).startTimer()
    const span = request.span
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.ORACLE, Enum.Events.Event.Action.PUT)
    span.setTags(spanTags)
    await span.audit({
      headers: request.headers,
      payload: request.payload
    }, EventSdk.AuditEventAction.start)
    const metadata = `${request.method} ${request.path}`
    try {
      await oracle.updateOracle(request.params, request.payload)
      histTimerEnd({ success: true })
      return h.response().code(204)
    } catch (err) {
      Logger.error(`ERROR - ${metadata}: ${err.stack}`)
      histTimerEnd({ success: false })
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  },
  /**
   * summary: Delete Oracle
   * description: The HTTP request DELETE /oracles/{ID} is used to delete information in the server regarding the provided oracle.
   * parameters: accept, ID, content-type, date
   * produces: application/json
   * responses: 204, 400, 401, 403, 404, 405, 406, 501, 503
   */
  delete: async (request, h) => {
    const histTimerEnd = Metrics.getHistogram(
      'authorization_get',
      'Get authorization by Id',
      ['success']
    ).startTimer()
    const span = request.span
    const spanTags = LibUtil.getSpanTags(request, Enum.Events.Event.Type.ORACLE, Enum.Events.Event.Action.DELETE)
    span.setTags(spanTags)
    await span.audit({
      headers: request.headers
    }, EventSdk.AuditEventAction.start)
    const metadata = `${request.method} ${request.path}`
    try {
      await oracle.deleteOracle(request.params)
      histTimerEnd({ success: true })
      return h.response().code(204)
    } catch (err) {
      Logger.error(`ERROR - ${metadata}: ${err.stack}`)
      histTimerEnd({ success: false })
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }
}
