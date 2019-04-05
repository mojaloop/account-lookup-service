'use strict'

const Boom = require('boom')

/**
 * Operations on /oracles
 */
module.exports = {
  /**
   * summary: Get Oracles
   * description: The HTTP request GET /oracles is used to return the list of all oracle endpoints. There are optional fields for type and currency i.e. /admin/oracles?type=MSISDN&amp;currency=USD which can be used to get more filtered results or a specific entry
   * parameters: type, currency, accept, content-type, date
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  get: function OracleGet(request, h) {
    return Boom.notImplemented()
  },
  /**
   * summary: Create Oracles
   * description: The HTTP request POST /oracles is used to create information in the server regarding the provided oracles. This request should be used for creation of Oracle information.
   * parameters: body, accept, content-length, content-type, date
   * produces: application/json
   * responses: 201, 400, 401, 403, 404, 405, 406, 501, 503
   */
  post: function OraclePost(request, h) {
    return Boom.notImplemented()
  }
}
