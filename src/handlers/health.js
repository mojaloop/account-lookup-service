'use strict'

/**
 * Operations on /health
 */
module.exports = {
  /**
   * summary: Get Oracles
   * description: The HTTP request GET /health is used to return the current status of the API .
   * parameters:
   * produces: application/json
   * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
   */
  get: function HealthGet(request, h) {
    return h.response({ status: 'OK' }).code(200)
  }
}
