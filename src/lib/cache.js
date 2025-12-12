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

const CatboxMemory = require('@hapi/catbox-memory')
const Catbox = require('@hapi/catbox')
const Config = require('../lib/config')

const expiresIn = parseInt(Config.GENERAL_CACHE_CONFIG.EXPIRES_IN_MS)
// Init memory client
const catboxMemoryClient = new CatboxMemory.Engine({ maxByteSize: Config.GENERAL_CACHE_CONFIG.MAX_BYTE_SIZE })
catboxMemoryClient.start()

class CacheClient {
  constructor (segment, generateFunc) {
    this.generateFunc = generateFunc
    if (Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED) this.policy = new Catbox.Policy({ generateFunc, expiresIn, generateTimeout: false }, catboxMemoryClient, segment)
  }

  get (key) {
    return Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED ? this.policy.get(key) : this.generateFunc(key)
  }

  drop (key) {
    return this.policy?.drop(key)
  }

  setGenerateFunc (generateFunc) {
    this.policy?.options({ generateFunc, expiresIn, generateTimeout: false })
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

const registerCacheClient = (id, generateFunc) => {
  const newClient = new CacheClient(id, generateFunc)
  cacheClients[id] = newClient
  return newClient
}

const initCache = async function () {
  // nothing to preload at the moment
}

const destroyCache = async function () {
  catboxMemoryClient.stop()
  await catboxMemoryClient.start()
}

const dropClients = function () {
  cacheClients = {}
}

const isCacheEnabled = function () {
  return Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED
}

module.exports = {
  // Clients registration
  registerCacheClient,

  // Init & destroy the cache
  initCache,
  destroyCache,
  isCacheEnabled,

  // exposed for tests
  Catbox,
  dropClients
}
