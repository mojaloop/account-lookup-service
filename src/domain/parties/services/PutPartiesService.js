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
  async handleRequest () {
    const { destination, source, proxy } = this.state
    this.log.info('handleRequest start', { destination, source, proxy })

    await this.validateSourceParticipant()
    if (proxy) {
      await this.checkProxySuccessResponse()
    }
    await this.identifyDestinationForSuccessCallback()
    await this.sendSuccessCallback()
  }

  async validateSourceParticipant () {
    const { source, proxy, proxyEnabled } = this.state
    const log = this.log.child({ source, proxy, method: 'validateSourceParticipant' })
    this.stepInProgress('validateSourceParticipant-1')

    const schemeParticipant = await super.validateParticipant(source)
    if (!schemeParticipant) {
      if (!proxyEnabled || !proxy) {
        throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.sourceFspNotFound, log)
      }

      const isCached = await this.deps.proxyCache.addDfspIdToProxyMapping(source, proxy)
      if (!isCached) {
        throw super.createFspiopIdNotFoundError('failed to addDfspIdToProxyMapping', log)
      }

      log.info('addDfspIdToProxyMapping is done', { source, proxy })
    }
  }

  async checkProxySuccessResponse () {
    if (this.state.proxyEnabled) {
      this.stepInProgress('checkProxySuccessResponse')
      const { headers, params } = this.inputs
      const { destination, source } = this.state
      const alsReq = this.deps.partiesUtils.alsRequestDto(destination, params)

      const isExists = await this.deps.proxyCache.receivedSuccessResponse(alsReq)
      if (!isExists) {
        this.log.verbose('NOT inter-scheme receivedSuccessResponse case')
        await this.removeProxyGetPartiesTimeoutCache(alsReq)
        return
      }

      const schemeParticipant = await super.validateParticipant(destination)
      if (schemeParticipant) {
        await this.#updateOracleWithParticipantMapping({ source, headers, params })
      }
    }
  }

  async identifyDestinationForSuccessCallback () {
    const { destination } = this.state
    this.stepInProgress('identifyDestinationForSuccessCallback')

    const proxyName = this.state.proxyEnabled && await this.deps.proxyCache.lookupProxyByDfspId(destination)
    if (!proxyName) {
      const destinationParticipant = await super.validateParticipant(destination)
      if (destinationParticipant) {
        this.state.requester = destinationParticipant.name
        return
      }
      const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
      this.log.warn(`${errMessage} and no proxy`, { destination })
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
    }

    this.state.requester = proxyName
  }

  async sendSuccessCallback () {
    const { headers, params, dataUri } = this.inputs
    const sendTo = this.state.requester
    this.stepInProgress('sendSuccessCallback')
    const payload = PutPartiesService.decodeDataUriPayload(dataUri)
    const callbackEndpointType = this.deps.partiesUtils.putPartyCbType(params.SubId)
    const options = this.deps.partiesUtils.partiesRequestOptionsDto(params)

    await this.deps.participant.sendRequest(
      headers, sendTo, callbackEndpointType, RestMethods.PUT, payload, options
    )
    this.log.verbose('sendSuccessCallback is sent', { sendTo, payload })
  }

  async #updateOracleWithParticipantMapping ({ source, headers, params }) {
    this.stepInProgress('#updateOracleWithParticipantMapping-3')
    const mappingPayload = {
      fspId: source
    }
    await this.deps.oracle.oracleRequest(headers, RestMethods.POST, params, null, mappingPayload, this.deps.cache)
    this.log.info('oracle was updated with mappingPayload', { mappingPayload })
  }
}

module.exports = PutPartiesService
