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

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const { AuditEventAction } = require('@mojaloop/event-sdk')
const createSpan = require('../../timeout/createSpan') // todo: think, how to avoid this external deps
const PutPartiesErrorService = require('./PutPartiesErrorService')

class TimeoutPartiesService extends PutPartiesErrorService {
  /**
   *  Should be used to get TimeoutPartiesService instance
   *
   * @param deps {PartiesDeps}
   * @param cacheKey {string}
   * @param spanName {string}
   * @returns {TimeoutPartiesService}
   */
  static createInstance (deps, cacheKey, spanName) {
    const { destination, partyType, partyId } = TimeoutPartiesService.parseExpiredKey(cacheKey)
    const headers = TimeoutPartiesService.createHubErrorCallbackHeaders(deps.config.HUB_NAME, destination, deps.config)
    const params = { Type: partyType, ID: partyId } // todo: think, if we need to handle party SubId
    const childSpan = createSpan(spanName, headers, params)

    return new TimeoutPartiesService({ ...deps, childSpan }, { headers, params })
  }

  async handleExpiredKey () {
    const { errorInfo, headers, params } = await this.prepareErrorInformation()
    this.#spanAuditStart(errorInfo)

    await this.identifyDestinationForCallback()
    return super.sendErrorCallback({ errorInfo, headers, params })
  }

  async prepareErrorInformation () {
    const { headers, params } = this.inputs
    headers.date = new Date().toUTCString()

    const error = TimeoutPartiesService.createFSPIOPExpiredError()
    const errorInfo = await this.deps.partiesUtils.makePutPartiesErrorPayload(
      this.deps.config, error, headers, params
    )
    this.log.verbose('prepareErrorInformation is done', { errorInfo, headers, params })
    return { errorInfo, headers, params }
  }

  #spanAuditStart (errorInformation) {
    const { headers } = this.inputs
    this.deps.childSpan?.audit({ errorInformation, headers }, AuditEventAction.start)
  }

  static parseExpiredKey (cacheKey) {
    const [destination, partyType, partyId] = cacheKey.split(':').slice(-3)
    return { destination, partyType, partyId }
  }

  static createFSPIOPExpiredError () {
    return ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.EXPIRED_ERROR)
  }
}

module.exports = TimeoutPartiesService
