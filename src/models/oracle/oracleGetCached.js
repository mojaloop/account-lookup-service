const Cache = require('../../lib/cache')
const request = require('@mojaloop/central-services-shared').Util.Request
const { hubNameRegex } = require('../../lib/util').hubNameConfig
const Config = require('../../lib/config')

let cacheClient

const sendHttpRequest = ({ method, ...restArgs }) => request.sendRequest({
  ...restArgs,
  method: method.toUpperCase(),
  hubNameRegex,
  axiosRequestOptionsOverride: {
    timeout: Config.HTTP_REQUEST_TIMEOUT_MS
  }
})

exports.oracleGetCached = params => cacheClient.get({ id: params.url, ...params })

const generate = async ({ id, ...params }) => (await sendHttpRequest(params)).data

exports.initialize = async () => {
  cacheClient = Cache.registerCacheClient({
    id: 'oracleGet',
    generate
  })
}
