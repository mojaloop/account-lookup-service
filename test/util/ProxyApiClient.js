const axiosLib = require('axios')
const stringify = require('fast-safe-stringify')
const Logger = require('@mojaloop/central-services-logger')
const { PROXY_PORT } = require('../integration/constants')

class ProxyApiClient {
  constructor ({
    baseURL = `http://localhost:${PROXY_PORT}`,
    axios = axiosLib.create({ baseURL }),
    logger = Logger
  } = {}) {
    this.baseURL = baseURL
    this.axios = axios
    this.logger = logger
  }

  async getHistory () {
    const { data } = await this.sendRequest({ url: '/history' })
    return data.history
  }

  async deleteHistory () {
    const { data } = await this.sendRequest({
      url: '/history',
      method: 'DELETE'
    })
    return data.history
  }

  async sendRequest ({ url, method = 'GET', headers = {}, body = null }) {
    try {
      const { data, statusCode } = await this.axios.request({
        method,
        url,
        headers,
        data: body
      })
      this.logger.info(`sendRequest is done: ${stringify({ data, statusCode, url, method })}`)
      return { data, statusCode }
    } catch (err) {
      this.logger.error(err)
      throw err
    }
  }
}

module.exports = ProxyApiClient
