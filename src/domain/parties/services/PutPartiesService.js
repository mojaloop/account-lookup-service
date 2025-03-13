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

const { RestMethods } = BasePartiesService.enums()

class PutPartiesService extends BasePartiesService {
  // async handleRequest () {
  //   // todo: add impl.
  // }

  async validateSourceParticipant ({ source, proxy }) {
    this.deps.stepState.inProgress('validateSourceParticipant-1')
    const requesterParticipant = await super.validateParticipant(source)

    if (!requesterParticipant) {
      if (!this.proxyEnabled || !proxy) {
        const errMessage = ERROR_MESSAGES.sourceFspNotFound
        this.log.warn(`${errMessage} and no proxy`, { source })
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      }
      const isCached = await this.deps.proxyCache.addDfspIdToProxyMapping(source, proxy)
      if (!isCached) {
        const errMessage = 'failed to addDfspIdToProxyMapping'
        this.log.warn(errMessage, { source, proxy })
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      }

      this.log.info('addDfspIdToProxyMapping is done', { source, proxy })
    }
  }

  async checkProxySuccessResponse ({ destination, source, headers, params }) {
    if (this.proxyEnabled) {
      this.deps.stepState.inProgress('checkProxySuccessResponse-2')
      const alsReq = this.deps.partiesUtils.alsRequestDto(destination, params)

      const isExists = await this.deps.proxyCache.receivedSuccessResponse(alsReq)
      if (isExists) {
        await this.#updateOracleWithParticipantMapping({ source, headers, params })
        return
      }
      this.log.warn('destination is NOT in scheme, and no cached sendToProxiesList', { destination, alsReq })
      // todo: think, if we need to throw an error here
    }
  }

  async identifyDestinationForSuccessCallback (destination) {
    this.deps.stepState.inProgress('validateDestinationParticipant-4')
    const destinationParticipant = await super.validateParticipant(destination)
    if (destinationParticipant) {
      return destinationParticipant.name
    }

    const proxyName = this.proxyEnabled && await this.deps.proxyCache.lookupProxyByDfspId(destination)
    if (!proxyName) {
      const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
      this.log.warn(`${errMessage} and no proxy`, { destination })
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
    }
    return proxyName
  }

  async sendSuccessCallback ({ sendTo, headers, params, dataUri }) {
    this.deps.stepState.inProgress('#sendSuccessCallback-6')
    const payload = PutPartiesService.decodeDataUriPayload(dataUri)
    const callbackEndpointType = this.deps.partiesUtils.putPartyCbType(params.SubId)
    const options = this.deps.partiesUtils.partiesRequestOptionsDto(params)

    await this.deps.participant.sendRequest(
      headers, sendTo, callbackEndpointType, RestMethods.PUT, payload, options
    )
    this.log.verbose('sendSuccessCallback is done', { sendTo, payload })
  }

  async #updateOracleWithParticipantMapping ({ source, headers, params }) {
    this.deps.stepState.inProgress('#updateOracleWithParticipantMapping-3')
    const mappingPayload = {
      fspId: source
    }
    await this.deps.oracle.oracleRequest(headers, RestMethods.POST, params, null, mappingPayload, this.deps.cache)
    this.log.info('oracle was updated with mappingPayload', { mappingPayload })
  }
}

module.exports = PutPartiesService
