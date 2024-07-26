/*****
 License
 --------------
 Copyright © 2020-2024 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0
 (the "License") and you may not use these files except in compliance with the [License](http://www.apache.org/licenses/LICENSE-2.0).

 You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the [License](http://www.apache.org/licenses/LICENSE-2.0).

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * INFITX
 - Steven Oderayi <steven.oderayi@infitx.com>

 --------------
 ******/
'use strict'

const Logger = require('@mojaloop/central-services-logger')
const ProxyCache = require('../../lib/proxyCache')

const timeoutInterschemePartiesLookups = async () => {
  const alsKeysExpiryPattern = 'als:*:*:*:expiresAt'
  // batch size, can be parameterized
  const count = 100
  const redis = (await ProxyCache.getConnectedCache()).redisClient

  return new Promise((resolve, reject) => {
    scanNode(redis.nodes('master'), 0, {
      match: alsKeysExpiryPattern,
      count,
      resolve,
      reject
    })
  })
}

const scanNode = (nodes, idx, options) => {
  const node = nodes[idx]
  const stream = node.scanStream({
    match: options.match,
    count: options.count
  })
  stream
    .on('data', async (keys) => {
      stream.pause()
      const proxyCache = await ProxyCache.getConnectedCache()
      const redis = proxyCache.redisClient
      try {
        for (const key of keys) {
          const item = await redis.get(key)
          if (Number(item) < Date.now()) {
            const actualKey = key.replace(':expiresAt', '')
            const proxyIds = await redis.smembers(actualKey)
            await sendTimeoutCallback(actualKey, proxyIds)
            // pipeline does not work here with ioredis, so we use Promise.all
            await Promise.all([redis.del(actualKey), redis.del(key)])
          }
        }
      } catch (err) {
        Logger.error(err)
        options.reject(err)
        return
      }

      stream.resume()
    })
    .on('end', () => {
      idx++
      if (idx < nodes.length) {
        scanNode(nodes, idx, options)
        return
      }
      options.resolve()
    })
}

const sendTimeoutCallback = async (cacheKey, proxyIds) => {
  Logger.info(`Timeout callback for ${cacheKey} with proxyIds: ${proxyIds}`)
}

module.exports = {
  timeoutInterschemePartiesLookups
}
