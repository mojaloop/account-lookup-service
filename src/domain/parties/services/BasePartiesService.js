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
const { decodePayload } = require('@mojaloop/central-services-shared').Util.StreamingProtocol
const { Enum } = require('@mojaloop/central-services-shared')

const { FspEndpointTypes, FspEndpointTemplates } = Enum.EndPoints
const { Headers, RestMethods } = Enum.Http

class BasePartiesService {
  constructor (deps) {
    this.deps = deps
    this.log = this.deps.log.child({ component: this.constructor.name })
    this.proxyEnabled = !!(deps.config.PROXY_CACHE_CONFIG?.enabled && deps.proxyCache)
  }

  // async handleRequest () {
  //   throw new Error('handleRequest must be implemented by subclass')
  // }

  async handleError ({ error, requester, headers, params }) {
    const log = this.log.child({ method: 'handleError' })
    try {
      log.error('error in processing parties request: ', error)
      const sendTo = requester || headers[Headers.FSPIOP.SOURCE]
      const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(error)
      const errorInfo = await this.deps.partiesUtils.makePutPartiesErrorPayload(this.deps.config, fspiopError, headers, params)

      await this.sendErrorCallback({ sendTo, errorInfo, headers, params })
      log.info('handleError in done', { sendTo, errorInfo })
      return fspiopError
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      log.error('failed to handleError. No further processing! ', exc)
    }
  }

  async validateParticipant (participantId) {
    return this.deps.participant.validateParticipant(participantId)
  }

  async sendErrorCallback ({ sendTo, errorInfo, headers, params, payload = undefined }) {
    const endpointType = this.deps.partiesUtils.errorPartyCbType(params.SubId)
    await this.deps.participant.sendErrorToParticipant(
      sendTo, endpointType, errorInfo, headers, params, payload, this.deps.childSpan
    )
    this.log.info('sendErrorCallback is done', { sendTo, errorInfo })
  }

  async sendDeleteOracleRequest (headers, params) {
    return this.deps.oracle.oracleRequest(headers, RestMethods.DELETE, params, null, null, this.deps.cache)
  }

  createFspiopIdNotFoundError (errMessage, log = this.log) {
    log.warn(errMessage)
    return ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
  }

  static decodeDataUriPayload (dataUri) {
    const decoded = decodePayload(dataUri, { asParsed: false })
    return decoded.body.toString()
  }

  static headersWithoutDestination (headers) {
    const { [Headers.FSPIOP.DESTINATION]: _, ...restHeaders } = headers || {}
    return restHeaders
  }

  static enums () {
    return {
      FspEndpointTypes,
      FspEndpointTemplates,
      Headers,
      RestMethods
    }
  }
}

module.exports = BasePartiesService
