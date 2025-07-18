/*****
 * @file This registers all handlers for the central-ledger API
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
 - Name Surname <name.surname@mojaloop.io>

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/
const fs = require('node:fs')
const RC = require('parse-strings-in-object')(require('rc')('ALS', require('../../config/default.json')))
const { storageTypeValues } = require('@mojaloop/inter-scheme-proxy-cache-lib')

function getFileContent (path) {
  if (!fs.existsSync(path)) {
    console.log(`File ${path} doesn't exist, can't enable JWS signing`)
    throw new Error('File doesn\'t exist')
  }
  return fs.readFileSync(path)
}

const getOrDefault = (value, defaultValue) => {
  if (value === undefined) {
    return defaultValue
  }

  return value
}

const DEFAULT_PROTOCOL_VERSION = {
  CONTENT: {
    DEFAULT: '1.1',
    VALIDATELIST: [
      '1.0',
      '1.1'
    ]
  },
  ACCEPT: {
    DEFAULT: '1',
    VALIDATELIST: [
      '1',
      '1.0',
      '1.1'
    ]
  }
}

const getProtocolVersions = (defaultProtocolVersions, overrideProtocolVersions) => {
  const T_PROTOCOL_VERSION = {
    ...defaultProtocolVersions,
    ...overrideProtocolVersions
  }

  if (overrideProtocolVersions && overrideProtocolVersions.CONTENT) {
    T_PROTOCOL_VERSION.CONTENT = {
      ...defaultProtocolVersions.CONTENT,
      ...overrideProtocolVersions.CONTENT
    }
  }
  if (overrideProtocolVersions && overrideProtocolVersions.ACCEPT) {
    T_PROTOCOL_VERSION.ACCEPT = {
      ...defaultProtocolVersions.ACCEPT,
      ...overrideProtocolVersions.ACCEPT
    }
  }

  if (T_PROTOCOL_VERSION.CONTENT &&
    T_PROTOCOL_VERSION.CONTENT.VALIDATELIST &&
    (typeof T_PROTOCOL_VERSION.CONTENT.VALIDATELIST === 'string' ||
      T_PROTOCOL_VERSION.CONTENT.VALIDATELIST instanceof String)) {
    T_PROTOCOL_VERSION.CONTENT.VALIDATELIST = JSON.parse(T_PROTOCOL_VERSION.CONTENT.VALIDATELIST)
  }
  if (T_PROTOCOL_VERSION.ACCEPT &&
    T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST &&
    (typeof T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST === 'string' ||
      T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST instanceof String)) {
    T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST = JSON.parse(T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST)
  }
  return T_PROTOCOL_VERSION
}

if (RC.PROXY_CACHE?.enabled && !storageTypeValues.includes(RC.PROXY_CACHE.type)) {
  throw new TypeError(`Incorrect proxyCache type: ${RC.PROXY_CACHE.type}`)
}

const config = {
  HUB_ID: RC.HUB_PARTICIPANT.ID,
  HUB_NAME: RC.HUB_PARTICIPANT.NAME,
  API_PORT: RC.API_PORT,
  API_TYPE: RC.API_TYPE, // 'fspiop' or 'iso20022'
  DATABASE: {
    client: RC.DATABASE.DIALECT,
    connection: {
      host: RC.DATABASE.HOST.replace(/\/$/, ''),
      port: RC.DATABASE.PORT,
      user: RC.DATABASE.USER,
      password: RC.DATABASE.PASSWORD,
      database: RC.DATABASE.DATABASE,
      ...RC.DATABASE.ADDITIONAL_CONNECTION_OPTIONS
    },
    maxPendingAcquire: RC.DATABASE.MAX_PENDING_ACQUIRE,
    pool: {
      // minimum size
      min: getOrDefault(RC.DATABASE.POOL_MIN_SIZE, 2),

      // maximum size
      max: getOrDefault(RC.DATABASE.POOL_MAX_SIZE, 10),
      // acquire promises are rejected after this many milliseconds
      // if a resource cannot be acquired
      acquireTimeoutMillis: getOrDefault(RC.DATABASE.ACQUIRE_TIMEOUT_MILLIS, 30000),

      // create operations are cancelled after this many milliseconds
      // if a resource cannot be acquired
      createTimeoutMillis: getOrDefault(RC.DATABASE.CREATE_TIMEOUT_MILLIS, 3000),

      // destroy operations are awaited for at most this many milliseconds
      // new resources will be created after this timeout
      destroyTimeoutMillis: getOrDefault(RC.DATABASE.DESTROY_TIMEOUT_MILLIS, 5000),

      // free resouces are destroyed after this many milliseconds
      idleTimeoutMillis: getOrDefault(RC.DATABASE.IDLE_TIMEOUT_MILLIS, 30000),

      // how often to check for idle resources to destroy
      reapIntervalMillis: getOrDefault(RC.DATABASE.REAP_INTERVAL_MILLIS, 1000),

      // long long to idle after failed create before trying again
      createRetryIntervalMillis: getOrDefault(RC.DATABASE.CREATE_RETRY_INTERVAL_MILLIS, 20)
      // ping: function (conn, cb) { conn.query('SELECT 1', cb) }
    },
    debug: getOrDefault(RC.DATABASE.DEBUG, false)
  },
  DISPLAY_ROUTES: RC.DISPLAY_ROUTES,
  RUN_MIGRATIONS: RC.RUN_MIGRATIONS,
  ADMIN_PORT: RC.ADMIN_PORT,
  CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG: RC.CENTRAL_SHARED_ENDPOINT_CACHE_CONFIG,
  CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG: RC.CENTRAL_SHARED_PARTICIPANT_CACHE_CONFIG,
  GENERAL_CACHE_CONFIG: RC.GENERAL_CACHE_CONFIG,
  HANDLERS: RC.HANDLERS,
  HANDLERS_DISABLED: RC.HANDLERS.DISABLED,
  HANDLERS_MONITORING_PORT: RC.HANDLERS.MONITORING_PORT,
  HANDLERS_TIMEOUT: RC.HANDLERS.TIMEOUT,
  HANDLERS_TIMEOUT_DISABLED: RC.HANDLERS.TIMEOUT.DISABLED,
  HANDLERS_TIMEOUT_TIMEXP: RC.HANDLERS.TIMEOUT.TIMEXP,
  HANDLERS_TIMEOUT_TIMEZONE: RC.HANDLERS.TIMEOUT.TIMEZONE,
  HANDLERS_TIMEOUT_BATCH_SIZE: RC.HANDLERS.TIMEOUT.BATCH_SIZE,
  ERROR_HANDLING: RC.ERROR_HANDLING,
  SWITCH_ENDPOINT: RC.SWITCH_ENDPOINT,
  INSTRUMENTATION_METRICS_DISABLED: RC.INSTRUMENTATION.METRICS.DISABLED,
  INSTRUMENTATION_METRICS_LABELS: RC.INSTRUMENTATION.METRICS.labels,
  INSTRUMENTATION_METRICS_CONFIG: RC.INSTRUMENTATION.METRICS.config,
  JWS_SIGN: RC.ENDPOINT_SECURITY.JWS.JWS_SIGN,
  FSPIOP_SOURCE_TO_SIGN: RC.HUB_PARTICIPANT.NAME,
  JWS_SIGNING_KEY_PATH: RC.ENDPOINT_SECURITY.JWS.JWS_SIGNING_KEY_PATH,
  API_DOC_ENDPOINTS_ENABLED: RC.API_DOC_ENDPOINTS_ENABLED || false,
  FEATURE_ENABLE_EXTENDED_PARTY_ID_TYPE: RC.FEATURE_ENABLE_EXTENDED_PARTY_ID_TYPE || false,
  PROTOCOL_VERSIONS: getProtocolVersions(DEFAULT_PROTOCOL_VERSION, RC.PROTOCOL_VERSIONS),
  PROXY_CACHE_CONFIG: RC.PROXY_CACHE,
  DELETE_PARTICIPANT_VALIDATION_ENABLED: RC.DELETE_PARTICIPANT_VALIDATION_ENABLED || false
}

if (config.JWS_SIGN) {
  config.JWS_SIGNING_KEY = getFileContent(config.JWS_SIGNING_KEY_PATH)
}

module.exports = config
