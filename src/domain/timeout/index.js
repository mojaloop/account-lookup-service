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
  const count = 100 // @todo batch size, can be parameterized
  const redis = await ProxyCache.getRedisClient()

  return Promise.all(redis.nodes('master').map(async (node) => {
    return new Promise((resolve, reject) => {
      processNode(node, {
        match: alsKeysExpiryPattern,
        count,
        resolve,
        reject
      })
    })
  }))
}

const processNode = (node, options) => {
  const stream = node.scanStream({
    match: options.match,
    count: options.count
  })
  stream
    .on('data', async (keys) => {
      stream.pause()
      try {
        // await processKeys(keys)
        await Promise.all(keys.map(async (key) => {
          return processKey(key)
        }))
      } catch (err) {
        stream.destroy(err)
        options.reject(err)
      }
      stream.resume()
    })

  stream.on('end', () => {
    options.resolve()
  })
}

const processKey = async (key) => {
  const redis = await ProxyCache.getRedisClient()

  const expiresAt = await redis.get(key)
  if (Number(expiresAt) >= Date.now()) {
    return
  }
  const actualKey = key.replace(':expiresAt', '')
  const proxyIds = await redis.smembers(actualKey)
  try {
    // @todo: we can parallelize this
    await sendTimeoutCallback(actualKey, proxyIds)
    // pipeline does not work here in cluster mode with ioredis, so we use Promise.all
    await Promise.all([redis.del(actualKey), redis.del(key)])
  } catch (err) {
    /**
     * We don't want to throw an error here, as it will stop the whole process
     * and we want to continue with the next keys
     * @todo We need to decide on how/when to finally give up on a key and remove it from the cache
     */
    Logger.error(err)
  }
}

const sendTimeoutCallback = async (cacheKey, proxyIds) => {
  throw new Error('Not implemented')
}

module.exports = {
  timeoutInterschemePartiesLookups
}
