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

const BasePartiesService = require('./BasePartiesService')
const { ERROR_MESSAGES } = require('../../../constants')

class PutPartiesErrorService extends BasePartiesService {
  async handleRequest () {
    if (this.state.proxyEnabled && this.state.proxy) {
      const alsReq = this.deps.partiesUtils.alsRequestDto(this.state.destination, this.inputs.params) // or source?
      const isInterSchemeDiscoveryCase = await this.deps.proxyCache.isPendingCallback(alsReq)

      if (isInterSchemeDiscoveryCase) {
        const isLast = await this.checkLastProxyCallback(alsReq)
        if (!isLast) {
          this.log.verbose('proxy error callback was processed (not last)')
          return
        }
      } else {
        const schemeParticipant = await this.validateParticipant(this.state.destination)
        if (schemeParticipant) {
          this.log.info('Need to cleanup oracle and forward SERVICE_CURRENTLY_UNAVAILABLE error')
          await this.cleanupOracle()
          await this.removeProxyGetPartiesTimeoutCache(alsReq)
          await this.forwardServiceUnavailableErrorCallback()
          return
        }
      }
    }

    await super.identifyDestinationForCallback()
    await this.sendErrorCallbackToParticipant()
    this.log.info('handleRequest is done')
  }

  async cleanupOracle () {
    this.stepInProgress('cleanupOracle')
    const { headers, params, payload } = this.inputs
    this.log.info('cleanupOracle due to error callback...', { payload })
    const swappedHeaders = this.deps.partiesUtils.swapSourceDestinationHeaders(headers)
    await super.sendDeleteOracleRequest(swappedHeaders, params)
  }

  async checkLastProxyCallback (alsReq) {
    this.stepInProgress('checkLastProxyCallback')
    const { proxy } = this.state
    const isLast = await this.deps.proxyCache.receivedErrorResponse(alsReq, proxy)
    this.log.info(`got ${isLast ? '' : 'NOT '}last inter-scheme error callback from a proxy`, { proxy, alsReq, isLast })
    return isLast
  }

  async sendErrorCallbackToParticipant () {
    const { headers, params, dataUri } = this.inputs
    const errorInfo = PutPartiesErrorService.decodeDataUriPayload(dataUri)
    return super.sendErrorCallback({ errorInfo, headers, params })
  }

  async forwardServiceUnavailableErrorCallback () {
    this.stepInProgress('forwardServiceUnavailableErrorCallback')
    const { headers, params } = this.inputs
    const error = super.createFspiopServiceUnavailableError(ERROR_MESSAGES.externalPartyError)
    const callbackHeaders = BasePartiesService.createErrorCallbackHeaders(headers, params, this.state.destination)
    const errorInfo = await this.deps.partiesUtils.makePutPartiesErrorPayload(this.deps.config, error, callbackHeaders, params)

    await super.sendErrorCallback({
      errorInfo,
      headers: callbackHeaders,
      params
    })
    this.log.verbose('#forwardServiceUnavailableErrorCallback is done', { callbackHeaders, errorInfo })
  }
}

module.exports = PutPartiesErrorService
