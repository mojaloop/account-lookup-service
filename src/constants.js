const ERROR_MESSAGES = Object.freeze({
  partySourceFspNotFound: 'Requester FSP not found',
  partyDestinationFspNotFound: 'Destination FSP not found',
  partyProxyNotFound: 'Proxy not found',
  proxyConnectionError: 'Proxy connection error',
  failedToCacheSendToProxiesList: 'Failed to cache sendToProxiesList'
})

module.exports = {
  ERROR_MESSAGES
}
