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

const generateFunc = async ({ url, headers, source, destination, method }) => (await sendHttpRequest({
  url,
  headers,
  source,
  destination,
  method
})).data

exports.initialize = async () => {
  cacheClient = Cache.registerCacheClient('oracleGet', generateFunc)
}
