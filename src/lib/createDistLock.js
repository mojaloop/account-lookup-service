/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const { distLock } = require('@mojaloop/central-services-shared').Util
const { TIMEOUT_HANDLER_DIST_LOCK_KEY } = require('../constants')

const createDistLock = (distLockConfig, logger) => {
  const distLockKey = TIMEOUT_HANDLER_DIST_LOCK_KEY
  const distLockTtl = distLockConfig?.lockTimeout || 10000
  const distLockAcquireTimeout = distLockConfig?.acquireTimeout || 5000

  const lock = distLockConfig?.enabled
    ? distLock.createLock(distLockConfig, logger)
    : null

  const acquireLock = async () => {
    if (lock) {
      try {
        return !!(await lock.acquire(distLockKey, distLockTtl, distLockAcquireTimeout))
      } catch (err) {
        logger.error('error acquiring distributed lock:', err)
        // should this be added to metrics?
        return false
      }
    }
    logger.info('distributed lock not configured or disabled, running without distributed lock')
    return true
  }

  const releaseLock = async () => {
    if (lock) {
      try {
        await lock.release()
        logger.verbose('distributed lock released')
      } catch (error) {
        logger.error('error releasing distributed lock:', error)
        // should this be added to metrics?
      }
    } else {
      logger.verbose('distributed lock not configured or disabled')
    }
  }

  return {
    acquireLock,
    releaseLock
  }
}

module.exports = createDistLock
