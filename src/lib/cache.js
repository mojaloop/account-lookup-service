/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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
 * Name Surname <name.surname@gatesfoundation.com>

 * Kevin Leyow <kevin.leyow@infitx.com>

 --------------
 ******/

'use strict'

const CatboxMemory = require('@hapi/catbox-memory')
const Config = require('../lib/config')

let enabled = true
let ttl
let catboxMemoryClient = null

class CacheClient {
  constructor (meta) {
    this.meta = meta
  }

  getMeta () {
    return this.meta
  }

  createKey (id) {
    return {
      segment: this.meta.id,
      id
    }
  }

  async get (key) {
    if (enabled) {
      return await catboxMemoryClient.get(key)
    }
    return null
  }

  async set (key, value) {
    await catboxMemoryClient.set(key, value, parseInt(ttl))
  }

  async drop (key) {
    await catboxMemoryClient.drop(key)
  }
}

/*
  Each client should register itself during module load.
  The client meta should be:
  {
    id [MANDATORY]
    preloadCache() [OPTIONAL]
      this will be called to preload data
  }
*/
let cacheClients = {}

const registerCacheClient = (clientMeta) => {
  const newClient = new CacheClient(clientMeta)
  cacheClients[clientMeta.id] = newClient
  return newClient
}

const initCache = async function () {
  // Read config
  ttl = Config.GENERAL_CACHE_CONFIG.EXPIRES_IN_MS
  enabled = Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED

  // Init catbox.
  catboxMemoryClient = new CatboxMemory.Engine({
    maxByteSize: Config.GENERAL_CACHE_CONFIG.MAX_BYTE_SIZE
  })
  await catboxMemoryClient.start()

  for (const clientId in cacheClients) {
    const clientMeta = cacheClients[clientId].getMeta()
    await clientMeta.preloadCache()
  }
}

const destroyCache = async function () {
  await catboxMemoryClient.stop()
  catboxMemoryClient = null
}

const dropClients = function () {
  cacheClients = {}
}

const isCacheEnabled = function () {
  return enabled
}

module.exports = {
  // Clients registration
  registerCacheClient,

  // Init & destroy the cache
  initCache,
  destroyCache,
  isCacheEnabled,

  // exposed for tests
  CatboxMemory,
  dropClients
}
