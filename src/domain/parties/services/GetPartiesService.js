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
const { createCallbackHeaders } = require('../../../lib/headers')
const BasePartiesService = require('./BasePartiesService')

const {
  FspEndpointTypes, FspEndpointTemplates,
  Headers, RestMethods
} = BasePartiesService.enums()

const proxyCacheTtlSec = 40 // todo: make configurable

class GetPartiesService extends BasePartiesService {
  async handleRequest () {
    const { destination, source, proxy } = this.state
    // see https://github.com/mojaloop/design-authority/issues/79
    // the requester has specified a destination routing header. We should respect that and forward the request directly to the destination
    // without consulting any oracles.
    this.log.info('handling getParties request', { source, destination, proxy })

    this.state.requester = await this.validateRequester()
    // dfsp in scheme  OR  proxy

    if (destination) {
      await this.forwardRequestToDestination()
      return
    }
    const response = await this.sendOracleDiscoveryRequest()

    if (Array.isArray(response?.data?.partyList) && response.data.partyList.length > 0) {
      const partyList = this.filterOraclePartyList(response)
      await this.processOraclePartyList(partyList)
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

    const sourceParticipant = await this.validateParticipant(source)
    if (sourceParticipant) {
      log.debug('source is in scheme')
      return source
    }

    if (!proxyEnabled || !proxy) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.sourceFspNotFound, log)
    }

    const proxyParticipant = await this.validateParticipant(proxy)
    if (!proxyParticipant) {
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

    const destParticipantModel = await this.validateParticipant(destination)
    if (!destParticipantModel) {
      this.stepInProgress('lookupProxyDestination-2')
      const proxyId = this.state.proxyEnabled && await this.deps.proxyCache.lookupProxyByDfspId(destination)

      if (!proxyId) {
        log.warn('destination participant is not in scheme, and no dfsp-to-proxy mapping', { destination })
        await super.sendDeleteOracleRequest(headers, params)
        return this.triggerInterSchemeDiscoveryFlow(GetPartiesService.headersWithoutDestination(headers))
        // think, if we need to remove proxy-header from the call above  ↑↑
      }
      sendTo = proxyId
    }

    await this.#forwardGetPartiesRequest({ sendTo, headers, params })
    log.info('discovery getPartiesByTypeAndID request was sent', { sendTo })
  }

  filterOraclePartyList (response) {
    // Oracle's API is a standard rest-style end-point Thus a GET /party on the oracle will return all participant-party records.
    // We must filter the results based on the callbackEndpointType to make sure we remove records containing partySubIdOrType when we are in FSPIOP_CALLBACK_URL_PARTIES_GET mode:
    this.stepInProgress('filterOraclePartyList-5')
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

  async processOraclePartyList (partyList) {
    const { headers, params } = this.inputs
    const log = this.log.child({ method: 'processOraclePartyList' })

    let sentCount = 0 // if sentCount === 0 after sending, should we restart the whole process?
    const sending = partyList.map(async party => {
      const { fspId } = party
      const clonedHeaders = { ...headers }
      if (!this.state.destination) {
        clonedHeaders[Headers.FSPIOP.DESTINATION] = fspId
      }
      this.stepInProgress('validateParticipant-6')
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
      if (this.state.proxyEnabled) {
        this.stepInProgress('lookupProxyByDfspId-7')
        const proxyName = await this.deps.proxyCache.lookupProxyByDfspId(fspId)
        if (!proxyName) {
          log.warn('no proxyMapping for participant!  Deleting reference in oracle...', { fspId })
          return super.sendDeleteOracleRequest(clonedHeaders, params)
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

    if (sentCount === 0) throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.noDiscoveryRequestsForwarded)
  }

  async getFilteredProxyList (proxy) {
    this.stepInProgress('getAllProxies-8')
    if (!this.state.proxyEnabled) {
      this.log.warn('proxyCache is not enabled')
      return []
    }

    const proxyNames = await this.deps.proxies.getAllProxiesNames(this.deps.config.SWITCH_ENDPOINT)
    this.log.debug('getAllProxiesNames is done', { proxyNames })
    return proxyNames.filter(name => name !== proxy)
  }

  async triggerInterSchemeDiscoveryFlow (headers) {
    const { params } = this.inputs
    const { proxy, source } = this.state
    const log = this.log.child({ method: 'triggerInterSchemeDiscoveryFlow' })
    log.verbose('triggerInterSchemeDiscoveryFlow start...', { proxy, source })

    const proxyNames = await this.getFilteredProxyList(proxy)
    if (!proxyNames.length) {
      return this.sendPartyNotFoundErrorCallback(headers)
    }

    this.stepInProgress('setSendToProxiesList-10')
    const alsReq = this.deps.partiesUtils.alsRequestDto(source, params)
    log.verbose('starting setSendToProxiesList flow: ', { proxyNames, alsReq, proxyCacheTtlSec })

    const isCached = await this.deps.proxyCache.setSendToProxiesList(alsReq, proxyNames, proxyCacheTtlSec)
    if (!isCached) {
      throw super.createFspiopIdNotFoundError(ERROR_MESSAGES.failedToCacheSendToProxiesList, log)
    }

    this.stepInProgress('sendingProxyRequests-11')
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

  async sendPartyNotFoundErrorCallback (headers) {
    const { params } = this.inputs
    const fspiopError = super.createFspiopIdNotFoundError('No proxy found to start inter-scheme discovery flow')
    const callbackHeaders = createCallbackHeaders({
      requestHeaders: headers,
      partyIdType: params.Type,
      partyIdentifier: params.ID,
      endpointTemplate: params.SubId
        ? FspEndpointTemplates.PARTIES_SUB_ID_PUT_ERROR
        : FspEndpointTemplates.PARTIES_PUT_ERROR
    })

    await this.sendErrorCallback({
      errorInfo: fspiopError.toApiErrorObject(this.deps.config.ERROR_HANDLING),
      headers: callbackHeaders,
      params
    })
    return fspiopError
  }

  async sendOracleDiscoveryRequest () {
    this.stepInProgress('sendOracleDiscoveryRequest')
    const { headers, params, query } = this.inputs
    return this.deps.oracle.oracleRequest(headers, RestMethods.GET, params, query, undefined, this.deps.cache)
  }

  async #forwardGetPartiesRequest ({ sendTo, headers, params }) {
    this.stepInProgress('#forwardGetPartiesRequest')
    const callbackEndpointType = this.deps.partiesUtils.getPartyCbType(params.SubId)
    const options = this.deps.partiesUtils.partiesRequestOptionsDto(params)

    return this.deps.participant.sendRequest(headers, sendTo, callbackEndpointType, RestMethods.GET, undefined, options, this.deps.childSpan)
  }
}

module.exports = GetPartiesService
