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
  // async handleRequest () {
  //   // todo: add impl.
  // }

  async checkPayee ({ headers, params, payload, proxy }) {
    const notValid = this.deps.partiesUtils.isNotValidPayeeCase(payload)
    if (notValid) {
      this.deps.stepState.inProgress('notValidPayeeCase-1')
      this.log.warn('notValidPayee case - deleting Participants and run getPartiesByTypeAndID', { proxy, payload })
      const swappedHeaders = this.deps.partiesUtils.swapSourceDestinationHeaders(headers)
      await super.sendDeleteOracleRequest(swappedHeaders, params)
    }
    return notValid
  }

  async checkLastProxyCallback ({ destination, proxy, params }) {
    this.deps.stepState.inProgress('checkLastProxyCallback-2')
    const alsReq = this.deps.partiesUtils.alsRequestDto(destination, params) // or source?
    const isLast = await this.deps.proxyCache.receivedErrorResponse(alsReq, proxy)
    this.log.info(`got${isLast ? '' : 'NOT'} last error callback from proxy`, { proxy, alsReq, isLast })
    return isLast
  }

  async identifyDestinationForErrorCallback (destination) {
    this.deps.stepState.inProgress('validateParticipant-3')
    const destinationParticipant = await super.validateParticipant(destination)
    if (destinationParticipant) return destination

    this.deps.stepState.inProgress('lookupProxyDestination-4')
    const proxyName = this.proxyEnabled && await this.deps.proxyCache.lookupProxyByDfspId(destination)
    if (proxyName) return proxyName

    const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
    this.log.warn(errMessage, { destination })
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
  }

  async sendErrorCallbackToParticipant ({ sendTo, headers, params, dataUri }) {
    this.deps.stepState.inProgress('sendErrorToParticipant-5')
    const errorInfo = PutPartiesErrorService.decodeDataUriPayload(dataUri)
    return super.sendErrorCallback({
      sendTo, errorInfo, headers, params
    })
  }
}

module.exports = PutPartiesErrorService
