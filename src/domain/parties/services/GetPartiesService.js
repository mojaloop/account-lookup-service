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
const { createCallbackHeaders } = require('../../../lib/headers')
const BasePartiesService = require('./BasePartiesService')

const {
  FspEndpointTypes, FspEndpointTemplates,
  Headers, RestMethods
} = BasePartiesService.enums()

const proxyCacheTtlSec = 40 // todo: make configurable

class GetPartiesService extends BasePartiesService {
  async handleRequest ({ headers, params, query, results }) {
    const source = headers[Headers.FSPIOP.SOURCE]
    const proxy = headers[Headers.FSPIOP.PROXY]
    const destination = headers[Headers.FSPIOP.DESTINATION]
    // see https://github.com/mojaloop/design-authority/issues/79
    // the requester has specified a destination routing header. We should respect that and forward the request directly to the destination
    // without consulting any oracles.
    this.log.info('handling getParties request', { source, destination, proxy })

    const requester = await this.validateRequester({ source, proxy })
    results.requester = requester

    if (destination) {
      await this.forwardRequestToDestination({ destination, headers, params })
      return
    }
    const response = await this.sendOracleDiscoveryRequest({ headers, params, query })

    if (Array.isArray(response?.data?.partyList) && response.data.partyList.length > 0) {
      const partyList = this.filterOraclePartyList({ response, params })
      await this.processOraclePartyList({ partyList, headers, params, destination })
      return
    }

    this.log.info('empty partyList form oracle, getting proxyList...', { params })
    const proxyNames = await this.getFilteredProxyList(proxy)

    if (proxyNames.length) {
      await this.triggerSendToProxiesFlow({ proxyNames, headers, params, source })
      return
    }

    results.fspiopError = await this.sendPartyNotFoundErrorCallback({ requester, headers, params })
  }

  async validateRequester ({ source, proxy }) {
    this.deps.stepState.inProgress('validateRequester-0')
    const log = this.log.child({ source, method: 'validateRequester' })

    const sourceParticipant = await this.validateParticipant(source)
    if (sourceParticipant) {
      log.debug('source is in scheme')
      return source
    }

    if (!this.proxyEnabled || !proxy) {
      const errMessage = ERROR_MESSAGES.sourceFspNotFound
      log.warn(errMessage)
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
    }

    const proxyParticipant = await this.validateParticipant(proxy)
    if (!proxyParticipant) {
      const errMessage = ERROR_MESSAGES.partyProxyNotFound
      log.warn(errMessage, { proxy })
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
    }

    const isCached = await this.deps.proxyCache.addDfspIdToProxyMapping(source, proxy)
    // think, what if isCached !== true?
    log.info('source is added to proxyMapping cache:', { proxy, isCached })
    return proxy
  }

  async forwardRequestToDestination ({ destination, headers, params }) {
    this.deps.stepState.inProgress('validateDestination-1')
    const log = this.log.child({ method: 'forwardRequestToDestination' })
    let sendTo = destination

    const destParticipantModel = await this.validateParticipant(destination)
    if (!destParticipantModel) {
      this.deps.stepState.inProgress('lookupProxyDestination-2')
      const proxyId = this.proxyEnabled && await this.deps.proxyCache.lookupProxyByDfspId(destination)

      if (!proxyId) {
        log.warn('no destination participant, and no dfsp-to-proxy mapping', { destination })
        const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
      }
      sendTo = proxyId
    }
    // all ok, go ahead and forward the request
    await this.#forwardGetPartiesRequest({ sendTo, headers, params })
    log.info('discovery getPartiesByTypeAndID request was sent', { sendTo })
  }

  filterOraclePartyList ({ response, params }) {
    // Oracle's API is a standard rest-style end-point Thus a GET /party on the oracle will return all participant-party records. We must filter the results based on the callbackEndpointType to make sure we remove records containing partySubIdOrType when we are in FSPIOP_CALLBACK_URL_PARTIES_GET mode:
    this.deps.stepState.inProgress('filterOraclePartyList-5')
    const callbackEndpointType = this.deps.partiesUtils.getPartyCbType(params.SubId)
    let filteredResponsePartyList

    switch (callbackEndpointType) {
      case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET:
        filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType == null) // Filter records that DON'T contain a partySubIdOrType
        break
      case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET:
        filteredResponsePartyList = response.data.partyList.filter(party => party.partySubIdOrType === params.SubId) // Filter records that match partySubIdOrType
        break
      default:
        filteredResponsePartyList = response // Fallback to providing the standard list
    }

    if (!Array.isArray(filteredResponsePartyList) || !filteredResponsePartyList.length) {
      const errMessage = 'Requested FSP/Party not found'
      this.log.warn(errMessage)
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
    }

    return filteredResponsePartyList
  }

  async processOraclePartyList ({ partyList, headers, params, destination }) {
    const log = this.log.child({ method: 'processOraclePartyList' })

    let sentCount = 0 // if sentCount === 0 after sending, should we restart the whole process?
    const sending = partyList.map(async party => {
      const { fspId } = party
      const clonedHeaders = { ...headers }
      if (!destination) {
        clonedHeaders[Headers.FSPIOP.DESTINATION] = fspId
      }
      this.deps.stepState.inProgress('validateParticipant-6')
      const schemeParticipant = await this.validateParticipant(fspId)
      if (schemeParticipant) {
        sentCount++
        log.info('participant is in scheme', { fspId })
        return this.#forwardGetPartiesRequest({
          sendTo: fspId,
          headers: clonedHeaders,
          params
        })
      }

      // If the participant is not in the scheme and proxy routing is enabled,
      // we should check if there is a proxy for it and send the request to the proxy
      if (this.proxyEnabled) {
        this.deps.stepState.inProgress('lookupProxyByDfspId-7')
        const proxyName = await this.deps.proxyCache.lookupProxyByDfspId(fspId)
        if (!proxyName) {
          log.warn('no proxyMapping for participant!  TODO: Delete reference in oracle...', { fspId })
          // todo: delete reference in oracle
        } else {
          sentCount++
          log.info('participant is NOT in scheme, use proxy name', { fspId, proxyName })
          return this.#forwardGetPartiesRequest({
            sendTo: proxyName,
            headers: clonedHeaders,
            params
          })
        }
      }
    })
    await Promise.all(sending)
    log.verbose('processOraclePartyList is done', { sentCount })
    // todo: think what if sentCount === 0 here
  }

  async getFilteredProxyList (proxy) {
    this.deps.stepState.inProgress('getAllProxies-8')
    if (!this.proxyEnabled) {
      this.log.warn('proxyCache is not enabled')
      return []
    }

    const proxyNames = await this.deps.proxies.getAllProxiesNames(this.deps.config.SWITCH_ENDPOINT)
    this.log.debug('getAllProxiesNames is done', { proxyNames })
    return proxyNames.filter(name => name !== proxy)
  }

  async triggerSendToProxiesFlow ({ proxyNames, headers, params, source }) {
    const log = this.log.child({ method: 'triggerSendToProxiesFlow' })
    this.deps.stepState.inProgress('setSendToProxiesList-10')
    const alsReq = this.deps.partiesUtils.alsRequestDto(source, params)
    log.info('starting setSendToProxiesList flow: ', { proxyNames, alsReq, proxyCacheTtlSec })

    const isCached = await this.deps.proxyCache.setSendToProxiesList(alsReq, proxyNames, proxyCacheTtlSec)
    if (!isCached) {
      log.warn('failed to setSendToProxiesList')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.failedToCacheSendToProxiesList)
    }

    this.deps.stepState.inProgress('sendingProxyRequests-11')
    const sending = proxyNames.map(
      sendTo => this.#forwardGetPartiesRequest({ sendTo, headers, params })
        .then(({ status, data } = {}) => ({ status, data }))
    )
    const results = await Promise.allSettled(sending)
    const isOk = results.some(result => result.status === 'fulfilled')
    // If, at least, one request is sent to proxy, we treat the whole flow as successful.
    // Failed requests should be handled by TTL expired/timeout handler
    // todo: - think, if we should handle failed requests here (e.g., by calling receivedErrorResponse)
    log.info('triggerSendToProxiesFlow is done:', { isOk, results, proxyNames, alsReq })
    this.deps.stepState.inProgress('allSent-12')
    if (!isOk) {
      log.warn('no successful requests sent to proxies')
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, ERROR_MESSAGES.proxyConnectionError)
    }
  }

  async sendPartyNotFoundErrorCallback ({ requester, headers, params }) {
    this.deps.stepState.inProgress('sendErrorCallback-9')
    const callbackHeaders = createCallbackHeaders({
      requestHeaders: headers,
      partyIdType: params.Type,
      partyIdentifier: params.ID,
      endpointTemplate: params.SubId
        ? FspEndpointTemplates.PARTIES_SUB_ID_PUT_ERROR
        : FspEndpointTemplates.PARTIES_PUT_ERROR
    })
    const fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND)

    await this.sendErrorCallback({
      sendTo: requester,
      errorInfo: fspiopError.toApiErrorObject(this.deps.config.ERROR_HANDLING),
      headers: callbackHeaders,
      params
    })
    return fspiopError
  }

  async sendOracleDiscoveryRequest ({ headers, params, query }) {
    this.deps.stepState.inProgress('oracleRequest-4')
    return this.deps.oracle.oracleRequest(headers, RestMethods.GET, params, query, undefined, this.deps.cache)
  }

  async #forwardGetPartiesRequest ({ sendTo, headers, params }) {
    this.deps.stepState.inProgress('forwardRequest-3')
    const callbackEndpointType = this.deps.partiesUtils.getPartyCbType(params.SubId)
    const options = this.deps.partiesUtils.partiesRequestOptionsDto(params)

    return this.deps.participant.sendRequest(headers, sendTo, callbackEndpointType, RestMethods.GET, undefined, options, this.deps.childSpan)
  }
}

module.exports = GetPartiesService
