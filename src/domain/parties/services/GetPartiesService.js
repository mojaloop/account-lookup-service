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
    const isSent = await this.processOraclePartyListResponse(response)
    this.log.info(`getParties request is ${isSent ? '' : 'NOT '}forwarded to oracle lookup DFSP`)
    if (isSent) return

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

    log.info('source is added to proxyMapping cache')
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
    if (!Array.isArray(response?.data?.partyList) || response.data.partyList.length === 0) {
      this.log.verbose('oracle partyList is empty')
      return false
    }

    this.stepInProgress('processOraclePartyList')
    const partyList = this.#filterOraclePartyList(response)

    let sentCount = 0
    await Promise.all(partyList.map(async party => {
      const isSent = await this.#processSingleOracleParty(party)
      if (isSent) sentCount++
    }))

    const isSent = sentCount > 0
    this.log.verbose('processOraclePartyList is done', { isSent, sentCount })
    // if NOT isSent, need to trigger interScheme discovery flow
    return isSent
  }

  async triggerInterSchemeDiscoveryFlow (headers) {
    const { params } = this.inputs
    const { proxy, source } = this.state
    const log = this.log.child({ source })
    log.verbose('triggerInterSchemeDiscoveryFlow start...', { proxy })

    const proxyNames = await this.#getFilteredProxyList(proxy)
    if (!proxyNames.length) {
      return this.#sendPartyNotFoundErrorCallback(headers)
    }

    const alsReq = await this.#setProxyListToCache(proxyNames, source, params)
    const sentList = await this.#sendOutProxyRequests({ proxyNames, alsReq, headers, params })
    if (sentList.length === 0) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.proxyConnectionError, log)
    }

    log.info('triggerInterSchemeDiscoveryFlow is done:', { sentList, alsReq })
    return sentList
  }

  isLocalSource () {
    const isLocal = this.state.source === this.state.requester
    this.log.debug(`isLocalSource: ${isLocal}`)
    return isLocal
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

      // Coz there's no destination header, it means we're inside initial inter-scheme discovery phase.
      // So we should proceed only if source is in scheme (local participant)
      const isLocalSource = this.isLocalSource()
      if (isLocalSource) {
        this.log.info('participant is NOT in scheme, but source is. So forwarding to proxy...', { fspId, proxyName })
        await this.#forwardGetPartiesRequest({ // todo: add timeout if sendTo is proxy
          sendTo: proxyName,
          headers: GetPartiesService.overrideDestinationHeader(headers, fspId),
          params
        })
        return true
      }
    }
    return false
  }

  async #sendPartyNotFoundErrorCallback (headers) {
    const { params } = this.inputs
    const callbackHeaders = GetPartiesService.createErrorCallbackHeaders(headers, params)
    const fspiopError = super.createFspiopIdNotFoundError('No proxy found to start inter-scheme discovery flow')
    const errorInfo = await this.deps.partiesUtils.makePutPartiesErrorPayload(
      this.deps.config, fspiopError, callbackHeaders, params
    )

    await this.sendErrorCallback({
      errorInfo,
      headers: callbackHeaders,
      params
    })
    return fspiopError
  }

  async #forwardGetPartiesRequest ({ sendTo, headers, params }) {
    this.stepInProgress('#forwardGetPartiesRequest')
    const callbackEndpointType = this.deps.partiesUtils.getPartyCbType(params.SubId)
    const options = this.deps.partiesUtils.partiesRequestOptionsDto(params)

    const sentResult = await this.deps.participant.sendRequest(
      headers, sendTo, callbackEndpointType, RestMethods.GET, undefined, options, this.deps.childSpan
    )
    await this.#setProxyGetPartiesTimeout(sendTo)
    this.log.debug('#forwardGetPartiesRequest is done:', { sendTo, sentResult })
    return sentResult
  }

  async #sendOutProxyRequests ({ proxyNames, alsReq, headers, params }) {
    this.stepInProgress('#sendOutProxyRequests')
    const sentList = []

    const sendProxyRequest = (sendTo) => this.#forwardGetPartiesRequest({ sendTo, headers, params })
      .then(() => { sentList.push(sendTo) })
      .catch(err => {
        this.log.error(`error in sending request to proxy ${sendTo}: `, err)
        return this.deps.proxyCache.receivedErrorResponse(alsReq, sendTo)
      })
      .catch(err => {
        this.log.error(`failed to remove proxy ${sendTo} from proxyCache: `, err)
      })
    await Promise.all(proxyNames.map(sendProxyRequest))

    this.log.verbose('#sendOutProxyRequests is done:', { sentList, proxyNames })
    return sentList
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

  async #setProxyListToCache (proxyNames, source, params) {
    this.stepInProgress('#setProxyListToCache')
    const alsReq = this.deps.partiesUtils.alsRequestDto(source, params)

    const isCached = await this.deps.proxyCache.setSendToProxiesList(alsReq, proxyNames, proxyCacheTtlSec)
    if (!isCached) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.failedToCacheSendToProxiesList)
    }
    this.log.verbose('#setProxyListToCache is done: ', { alsReq, proxyNames, proxyCacheTtlSec })
    return alsReq
  }

  async #setProxyGetPartiesTimeout (sendTo) {
    const isLocalSource = this.isLocalSource()
    const isSentToProxy = this.state.destination !== sendTo
    this.log.verbose('isLocalSource and isSentToProxy: ', { isLocalSource, isSentToProxy, sendTo })

    if (isSentToProxy && isLocalSource) {
      this.stepInProgress('#setProxyGetPartiesTimeout')
      const alsReq = this.deps.partiesUtils.alsRequestDto(this.state.source, this.inputs.params)
      const isSet = await this.deps.proxyCache.setProxyGetPartiesTimeout(alsReq, sendTo)
      this.log.info('#setProxyGetPartiesTimeout is done', { isSet })
      return isSet
    }
  }
}

module.exports = GetPartiesService
