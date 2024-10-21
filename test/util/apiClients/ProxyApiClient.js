const { PROXY_PORT } = require('../../integration/constants')
const BasicApiClient = require('./BasicApiClient')

const baseURL = `http://localhost:${PROXY_PORT}`

class ProxyApiClient extends BasicApiClient {
  constructor (deps) {
    super({ ...deps, baseURL })
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
}

module.exports = ProxyApiClient
