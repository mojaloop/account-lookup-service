'use strict'

const model = require('../../../../model').parties
const err = require('../../../../lib/error/error')
//const AppError = err.ApplicationError;
const syncResponses = err.responses.build
const asyncResponses = err.responses.async
const pp = require('util').inspect

/**
 * Operations on /parties/{Type}/{ID}/error
 */
module.exports = {
  /**
   * summary: PartiesErrorByTypeAndID
   * description: If the server is unable to find Party information of the provided identity, or another processing error occurred, the error callback PUT /parties/&lt;Type&gt;/&lt;ID&gt;/error (or PUT /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;/error) is used.
   * parameters: Type, ID, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  put: function PartiesErrorByTypeAndID(req, h) {
    if (req.params.Type !== 'MSISDN') {
      return syncResponses.badRequestMalformedType(h)
    }
    (async function () {
      const metadata = `${req.method} ${req.path}`
      const {logger} = req.server.app
      try {
        logger(`received: ${metadata}. ${pp(req.params)}`)
        await model.handleMSISDNPartyErrorResponse(req.server.app, req)
        logger(`success: ${metadata}.`)
      } catch (err) {
        logger(`ERROR - ${metadata}: ${err.stack || pp(err)}`)
        const requesterName = req.headers['fspiop-source'] // should not fail; should have been validated already
        const {requests: rq, database: db} = req.server.app.requests
        const url = await rq.createErrorUrl(db, req.path, requesterName)
        // TODO: review this error message
        rq.sendError(url, asyncResponses.serverError, rq.defaultHeaders(requesterName, 'participants'), {logger})
      }
    })()
    return h.response().code(200)
  }
}
