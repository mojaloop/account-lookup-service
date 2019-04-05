'use strict'

const Boom = require('boom')

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
  put: function OraclePut(request, h) {
    return Boom.notImplemented()
  },
  /**
   * summary: Delete Oracle
   * description: The HTTP request DELETE /oracles/{ID} is used to delete information in the server regarding the provided oracle.
   * parameters: accept, ID, content-type, date
   * produces: application/json
   * responses: 204, 400, 401, 403, 404, 405, 406, 501, 503
   */
  delete: function OracleDelete(request, h) {
    return Boom.notImplemented()
  }
}
