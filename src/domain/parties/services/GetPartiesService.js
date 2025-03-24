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

const { ERROR_MESSAGES } = require('../../../constants')
const BasePartiesService = require('./BasePartiesService')

const { FspEndpointTypes, RestMethods } = BasePartiesService.enums()
const proxyCacheTtlSec = 40 // todo: make configurable

class GetPartiesService extends BasePartiesService {
  async handleRequest () {
    const { destination, source, proxy } = this.state
    // see https://github.com/mojaloop/design-authority/issues/79
    // the requester has specified a destination routing header. We should respect that and forward the request directly to the destination
    // without consulting any oracles.
    this.log.info('handling getParties request...', { source, destination, proxy })
    this.state.requester = await this.validateRequester()

    if (destination) {
      await this.forwardRequestToDestination()
      return
    }

    const response = await this.sendOracleDiscoveryRequest()
    if (Array.isArray(response?.data?.partyList) && response.data.partyList.length > 0) {
      await this.processOraclePartyListResponse(response)
      return
    }

    this.log.info('empty partyList form oracle, checking inter-scheme discovery flow...')
    const fspiopError = await this.triggerInterSchemeDiscoveryFlow(this.inputs.headers)
    if (fspiopError) {
      this.state.fspiopError = fspiopError // todo: think, if we need this
    }
  }

  async validateRequester () {
    const { source, proxy, proxyEnabled } = this.state
    const log = this.log.child({ source, proxy, method: 'validateRequester' })
    this.stepInProgress('validateRequester-0')

    const schemeSource = await this.validateParticipant(source)
    if (schemeSource) {
      log.debug('source participant is in scheme')
      return source
    }

    if (!proxyEnabled || !proxy) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.sourceFspNotFound, log)
    }

    const schemeProxy = await this.validateParticipant(proxy)
    if (!schemeProxy) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.partyProxyNotFound, log)
    }

    const isCached = await this.deps.proxyCache.addDfspIdToProxyMapping(source, proxy)
    if (!isCached) {
      throw super.createFspiopIdNotFoundError('failed to addDfspIdToProxyMapping', log)
    }

    log.info('source is added to proxyMapping cache:', { proxy, isCached })
    return proxy
  }

  async forwardRequestToDestination () {
    const { headers, params } = this.inputs
    const { destination } = this.state
    const log = this.log.child({ method: 'forwardRequestToDestination' })
    let sendTo = destination

    const schemeParticipant = await this.validateParticipant(destination)
    if (!schemeParticipant) {
      this.stepInProgress('lookupProxyDestination-2')
      const proxyId = this.state.proxyEnabled && await this.deps.proxyCache.lookupProxyByDfspId(destination)

      if (!proxyId) {
        log.warn('destination participant is not in scheme, and no dfsp-to-proxy mapping', { destination })
        await super.sendDeleteOracleRequest(headers, params)
        await this.triggerInterSchemeDiscoveryFlow(GetPartiesService.headersWithoutDestination(headers))
        return
      }
      sendTo = proxyId
    }

    await this.#forwardGetPartiesRequest({ sendTo, headers, params })
    log.info('discovery getPartiesByTypeAndID request was sent', { sendTo })
  }

  async sendOracleDiscoveryRequest () {
    this.stepInProgress('#sendOracleDiscoveryRequest')
    const { headers, params, query } = this.inputs
    return this.deps.oracle.oracleRequest(headers, RestMethods.GET, params, query, undefined, this.deps.cache)
  }

  async processOraclePartyListResponse (response) {
    this.stepInProgress('processOraclePartyList')
    const partyList = this.#filterOraclePartyList(response)

    let sentCount = 0 // if sentCount === 0 after sending, we send idNotFound error
    await Promise.all(partyList.map(async party => {
      const isSent = await this.#processSingleOracleParty(party)
      if (isSent) sentCount++
    }))
    this.log.verbose('processOraclePartyList is done', { sentCount })

    if (sentCount === 0) throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.noDiscoveryRequestsForwarded)
  }

  async triggerInterSchemeDiscoveryFlow (headers) {
    const { params } = this.inputs
    const { proxy, source } = this.state
    const log = this.log.child({ method: 'triggerInterSchemeDiscoveryFlow' })
    log.verbose('triggerInterSchemeDiscoveryFlow start...', { proxy, source })

    const proxyNames = await this.#getFilteredProxyList(proxy)
    if (!proxyNames.length) {
      return this.#sendPartyNotFoundErrorCallback(headers)
    }

    this.stepInProgress('setSendToProxiesList-10')
    const alsReq = this.deps.partiesUtils.alsRequestDto(source, params)
    log.verbose('starting setSendToProxiesList flow: ', { proxyNames, alsReq, proxyCacheTtlSec })

    const isCached = await this.deps.proxyCache.setSendToProxiesList(alsReq, proxyNames, proxyCacheTtlSec)
    if (!isCached) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.failedToCacheSendToProxiesList, log)
    }

    this.stepInProgress('sendingProxyRequests')
    const sending = proxyNames.map(
      sendTo => this.#forwardGetPartiesRequest({ sendTo, headers, params })
        .then(({ status, data } = {}) => ({ status, data }))
    )
    const results = await Promise.allSettled(sending)
    const isOk = results.some(result => result.status === 'fulfilled')
    // If, at least, one request is sent to proxy, we treat the whole flow as successful.
    // Failed requests should be handled by TTL expired/timeout handler
    log.info('triggerInterSchemeDiscoveryFlow is done:', { isOk, results, proxyNames, alsReq })
    this.stepInProgress('allSent-12')

    if (!isOk) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.proxyConnectionError, log)
    }
  }

  #filterOraclePartyList (response) {
    // Oracle's API is a standard rest-style end-point Thus a GET /party on the oracle will return all participant-party records.
    // We must filter the results based on the callbackEndpointType to make sure we remove records containing partySubIdOrType when we are in FSPIOP_CALLBACK_URL_PARTIES_GET mode:
    this.stepInProgress('filterOraclePartyList')
    const { params } = this.inputs
    const callbackEndpointType = this.deps.partiesUtils.getPartyCbType(params.SubId)
    let filteredPartyList

    switch (callbackEndpointType) {
      case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET:
        filteredPartyList = response.data.partyList.filter(party => party.partySubIdOrType == null) // Filter records that DON'T contain a partySubIdOrType
        break
      case FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET:
        filteredPartyList = response.data.partyList.filter(party => party.partySubIdOrType === params.SubId) // Filter records that match partySubIdOrType
        break
      default:
        filteredPartyList = response // Fallback to providing the standard list
    }

    if (!Array.isArray(filteredPartyList) || !filteredPartyList.length) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.emptyFilteredPartyList)
    }

    return filteredPartyList
  }

  /** @returns {Promise<boolean>} - is request forwarded to participant */
  async #processSingleOracleParty (party) {
    const { headers, params } = this.inputs
    const { fspId } = party

    const schemeParticipant = await this.validateParticipant(fspId)
    if (schemeParticipant) {
      this.log.info('participant is in scheme, so forwarding to it...', { fspId })
      await this.#forwardGetPartiesRequest({
        sendTo: fspId,
        headers: GetPartiesService.overrideDestinationHeader(headers, fspId),
        params
      })
      return true
    }

    if (this.state.proxyEnabled) {
      const proxyName = await this.deps.proxyCache.lookupProxyByDfspId(fspId)
      if (!proxyName) {
        this.log.warn('no proxyMapping for external DFSP!  Deleting reference in oracle...', { fspId })
        await super.sendDeleteOracleRequest(headers, params)
        // todo: check if it won't delete all parties
        return false
      }

      // Coz there's no destination header, it means we're inside initial inter-scheme discovery phase from requester.
      // So we should proceed only if source is in scheme (local participant)

      // const schemeSource = await this.validateParticipant(this.state.source)
      // if (schemeSource) {
      if (!this.state.proxy) {
        this.log.info('participant is NOT in scheme, but source is. So forwarding to proxy...', { fspId, proxyName })
        await this.#forwardGetPartiesRequest({
          sendTo: proxyName,
          headers: GetPartiesService.overrideDestinationHeader(headers, fspId),
          params
        })
        return true
      }

      // todo: think, how to forward request from ZM on Region to MW
      // So regional scheme might have partyInfo in oracle when gets initial inter-scheme discovery call from buffer scheme
      console.log('todo....')
    }
  }

  async #sendPartyNotFoundErrorCallback (headers) {
    const { params } = this.inputs
    const fspiopError = super.createFspiopIdNotFoundError('No proxy found to start inter-scheme discovery flow')

    await this.sendErrorCallback({
      errorInfo: fspiopError.toApiErrorObject(this.deps.config.ERROR_HANDLING),
      headers: GetPartiesService.createErrorCallbackHeaders(headers, params),
      params
    })
    return fspiopError
  }

  async #forwardGetPartiesRequest ({ sendTo, headers, params }) {
    this.stepInProgress('#forwardGetPartiesRequest')
    const callbackEndpointType = this.deps.partiesUtils.getPartyCbType(params.SubId)
    const options = this.deps.partiesUtils.partiesRequestOptionsDto(params)

    return this.deps.participant.sendRequest(headers, sendTo, callbackEndpointType, RestMethods.GET, undefined, options, this.deps.childSpan)
  }

  async #getFilteredProxyList (proxy) {
    this.stepInProgress('#getFilteredProxyList')
    if (!this.state.proxyEnabled) {
      this.log.warn('proxyCache is not enabled')
      return []
    }

    const proxyNames = await this.deps.proxies.getAllProxiesNames(this.deps.config.SWITCH_ENDPOINT)
    this.log.debug('getAllProxiesNames is done', { proxyNames })
    return proxyNames.filter(name => name !== proxy)
  }
}

module.exports = GetPartiesService
