'use strict'

/**
 * Operations on /participants/{ID}
 */
module.exports = {
  /**
   * summary: ParticipantsByID
   * description: The callback PUT /participants/&lt;ID&gt; is used to inform the client of the result of the creation of the provided list of identities.
   * parameters: ID, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  put: function ParticipantsByIDPut(request, h) {
    return h.response({errorInformation: {errorCode: '501', errorDescription: 'Not implemented'}}).code(501)
  }
}
