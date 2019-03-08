'use strict'

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
  post: function Participants1(request, h) {
    return h.response({errorInformation: {errorCode: '501', errorDescription: 'Not implemented'}}).code(501)
  }
}
