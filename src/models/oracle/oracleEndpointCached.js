'use strict'

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Cache = require('../../lib/cache')
const Metrics = require('@mojaloop/central-services-metrics')
const OracleEndpointUncached = require('./oracleEndpoint')

let cacheClient

const getCacheKey = (params) => {
  return `${Object.values(params).join('__')}`
}

const getOracleEndpointCached = async (params) => {
  const histTimer = Metrics.getHistogram(
    'model_oracleEndpoints',
    'model_getOracleEndpointsCached - Metrics for oracle endpoints cached model',
    ['success', 'queryName', 'hit']
  ).startTimer()
  const partyIdType = params.partyIdType || null
  const currency = params.currency || null

  // Do we have valid participants list in the cache ?
  const cacheKey = getCacheKey(params)
  let cachedEndpoints = cacheClient.get(cacheKey)
  if (!cachedEndpoints) {
    // No oracleEndpoint in the cache, so fetch from participant API
    let oracleEndpoints
    if (partyIdType && currency) {
      oracleEndpoints = await OracleEndpointUncached.getOracleEndpointByTypeAndCurrency(partyIdType, currency)
    } else if (currency) {
      oracleEndpoints = await OracleEndpointUncached.getOracleEndpointByCurrency(currency)
    } else {
      oracleEndpoints = await OracleEndpointUncached.getOracleEndpointByType(partyIdType)
    }

    // store in cache
    cacheClient.set(cacheClient, oracleEndpoints)
    histTimer({ success: true, queryName: 'model_getOracleEndpointCached', hit: false })
  } else {
    // unwrap oracleEnpoints list from catbox structure
    cachedEndpoints = cachedEndpoints.item
    histTimer({ success: true, queryName: 'model_getOracleEndpointCached', hit: true })
  }
  return cachedEndpoints
}

/*
  Public API
*/
exports.initialize = async () => {
  /* Register as cache client */
  const oracleEndpointCacheClientMeta = {
    id: 'oracleEndpoints'
  }

  cacheClient = Cache.registerCacheClient(oracleEndpointCacheClientMeta)
}

exports.getOracleEndpointByTypeAndCurrency = async (partyIdType, currency) => {
  try {
    return await getOracleEndpointCached({ partyIdType, currency })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

exports.getOracleEndpointByType = async (partyIdType) => {
  try {
    return await getOracleEndpointCached({ partyIdType })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

exports.getOracleEndpointByCurrency = async (currency) => {
  try {
    return await getOracleEndpointCached({ currency })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}
