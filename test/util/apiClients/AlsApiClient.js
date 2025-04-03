const config = require('../../../src/lib/config')
const BasicApiClient = require('./BasicApiClient')

const baseURL = `http://localhost:${config.API_PORT}`

class AlsProxyApiClient extends BasicApiClient {
  constructor (deps) {
    super({ ...deps, baseURL })
  }

  async getPartyByIdAndType ({ partyId, partyIdType, source, destination, proxy = '', addHeaders = null }) {
    return this.sendPartyRequest({
      partyId, partyIdType, source, destination, proxy, addHeaders
    })
  }

  async putPartiesSuccess ({ partyId, partyIdType, source, destination, proxy = '', body = {} }) {
    return this.sendPartyRequest({
      partyId, partyIdType, source, destination, proxy, body
    })
  }

  async putPartiesError ({ partyId, partyIdType, source, destination, proxy = '', body = {} }) {
    const isError = true
    return this.sendPartyRequest({
      partyId, partyIdType, source, destination, proxy, body, isError
    })
  }

  async sendPartyRequest ({
    partyId, partyIdType, source, destination, proxy = '', body = null, isError = false, addHeaders = null
  }) {
    const method = body ? 'PUT' : 'GET'
    const url = `/parties/${partyIdType}/${partyId}${isError ? '/error' : ''}`
    const headers = this.fixtures.partiesCallHeadersDto({ source, destination, proxy, addHeaders })

    return this.sendRequest({
      method,
      url,
      headers,
      body
    })
  }
}

module.exports = AlsProxyApiClient
