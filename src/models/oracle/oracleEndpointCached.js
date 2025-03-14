/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the 2020-2025 Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation
 * Name Surname <name.surname@mojaloop.io>

 * Kevin Leyow <kevin.leyow@infitx.com>

 --------------
 ******/

'use strict'

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Cache = require('../../lib/cache')
const Metrics = require('@mojaloop/central-services-metrics')
const OracleEndpointUncached = require('./oracleEndpoint')

let cacheClient
const extensions = [{
  key: 'system',
  value: '["db","@hapi/catbox-memory"]'
}]

const getCacheKey = (params) => {
  return cacheClient.createKey(`${Object.values(params).join('__')}`)
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
    if (params.assertPendingAcquire) OracleEndpointUncached.assertPendingAcquires()
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
    cacheClient.set(cacheKey, oracleEndpoints)
    cachedEndpoints = oracleEndpoints
    histTimer({ success: true, queryName: 'model_getOracleEndpointCached', hit: false })
  } else {
    // unwrap oracleEndpoints list from catbox structure
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
    id: 'oracleEndpoints',
    preloadCache: async () => Promise.resolve()
  }

  cacheClient = Cache.registerCacheClient(oracleEndpointCacheClientMeta)
}

exports.getOracleEndpointByTypeAndCurrency = async (partyIdType, currency, assertPendingAcquire) => {
  try {
    return await getOracleEndpointCached({ partyIdType, currency, assertPendingAcquire })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(
      err,
      undefined,
      undefined,
      extensions
    )
  }
}

exports.getOracleEndpointByType = async (partyIdType, assertPendingAcquire) => {
  try {
    return await getOracleEndpointCached({ partyIdType, assertPendingAcquire })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(
      err,
      undefined,
      undefined,
      extensions
    )
  }
}

exports.getOracleEndpointByCurrency = async (currency, assertPendingAcquire) => {
  try {
    return await getOracleEndpointCached({ currency, assertPendingAcquire })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(
      err,
      undefined,
      undefined,
      extensions
    )
  }
}
