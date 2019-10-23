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
 ******/
'use strict'

const pp = require('util').inspect
const participants = require('../../../../domain/participants')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

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
  put: function (req, h) {
    (async function () {
      const metadata = `${req.method} ${req.path}`
      try {
        req.server.log(['info'], `received: ${metadata}. ${pp(req.params)}`)
        await participants.putParticipantsErrorByTypeAndID(req)
        req.server.log(['info'], `success: ${metadata}.`)
      } catch (err) {
        req.server.log(['error'], `ERROR - ${metadata}: ${pp(err)}`)
        throw ErrorHandler.Factory.reformatFSPIOPError(err)
      }
    })()
    return h.response().code(202)
  }
}
