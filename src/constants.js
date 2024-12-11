const ERROR_MESSAGES = Object.freeze({
  partySourceFspNotFound: 'Requester FSP not found',
  partyDestinationFspNotFound: 'Destination FSP not found',
  partyProxyNotFound: 'Proxy not found',
  proxyConnectionError: 'Proxy connection error',
  failedToCacheSendToProxiesList: 'Failed to cache sendToProxiesList'
})

const HANDLER_TYPES = Object.freeze({
  TIMEOUT: 'timeout'
})

module.exports = {
  ERROR_MESSAGES,
  HANDLER_TYPES
}
