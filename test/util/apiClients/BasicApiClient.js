const axiosLib = require('axios')
const { loggerFactory } = require('../../../src/lib')
const fixtures = require('../../fixtures')

class BasicApiClient {
  constructor ({
    baseURL,
    axios = axiosLib.create({ baseURL }),
    logger = loggerFactory(this.constructor.name)
  } = {}) {
    this.baseURL = baseURL
    this.axios = axios
    this.logger = logger
    this.fixtures = fixtures
  }

  async sendRequest ({ url, method = 'GET', headers = {}, body = null }) {
    try {
      const { data, status } = await this.axios.request({
        method,
        url,
        headers,
        data: body
      })
      this.logger.info('sendRequest is done:', { method, url, body, headers, response: { status, data } })
      return { data, status }
    } catch (err) {
      this.logger.error('error in sendRequest: ', err)
      throw err
    }
  }
}

module.exports = BasicApiClient
