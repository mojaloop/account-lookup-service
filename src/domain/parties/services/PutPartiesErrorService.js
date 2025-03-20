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
const { ERROR_MESSAGES } = require('../../../constants')
const BasePartiesService = require('./BasePartiesService')

class PutPartiesErrorService extends BasePartiesService {
  async handleRequest () {
    if (this.state.proxyEnabled && this.state.proxy) {
      const alsReq = this.deps.partiesUtils.alsRequestDto(this.state.destination, this.inputs.params) // or source?
      const isPending = await this.deps.proxyCache.isPendingCallback(alsReq)

      if (!isPending) {
        // not initial inter-scheme discovery case. Cleanup oracle and trigger inter-scheme discovery
        this.log.warn('Need to cleanup oracle and trigger new inter-scheme discovery flow')
        await this.cleanupOracle()
        return true // need to trigger inter-scheme discovery
      }

      const isLast = await this.checkLastProxyCallback(alsReq)
      if (!isLast) {
        this.log.verbose('putPartiesErrorByTypeAndID proxy callback was processed')
        return
      }
    }

    await this.identifyDestinationForErrorCallback()
    await this.sendErrorCallbackToParticipant()
    this.log.info('putPartiesByTypeAndID is done')
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
    this.log.info(`got${isLast ? '' : 'NOT'} last error callback from proxy`, { proxy, alsReq, isLast })
    return isLast
  }

  async identifyDestinationForErrorCallback () {
    this.stepInProgress('identifyDestinationForErrorCallback')
    const { destination } = this.state
    const schemeParticipant = await super.validateParticipant(destination)
    if (schemeParticipant) {
      this.state.requester = destination
      return
    }

    this.stepInProgress('lookupProxyDestination-4')
    const proxyName = this.state.proxyEnabled && await this.deps.proxyCache.lookupProxyByDfspId(destination)
    if (proxyName) {
      this.state.requester = proxyName
      return
    }

    const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
    this.log.warn(errMessage, { destination })
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
  }

  async sendErrorCallbackToParticipant () {
    const { headers, params, dataUri } = this.inputs
    const errorInfo = PutPartiesErrorService.decodeDataUriPayload(dataUri)
    return super.sendErrorCallback({ errorInfo, headers, params })
  }
}

module.exports = PutPartiesErrorService
