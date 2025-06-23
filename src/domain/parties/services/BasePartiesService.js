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
const { Enum } = require('@mojaloop/central-services-shared')
const { decodePayload } = require('@mojaloop/central-services-shared').Util.StreamingProtocol
const { initStepState } = require('../../../lib/util')
const { createCallbackHeaders } = require('../../../lib/headers')
const { ERROR_MESSAGES } = require('../../../constants')
const config = require('../../../lib/config')
const { makeAcceptContentTypeHeader } = require('@mojaloop/central-services-shared').Util.Headers

const { FspEndpointTypes, FspEndpointTemplates } = Enum.EndPoints
const { Headers, RestMethods } = Enum.Http

/**
 * @typedef {Object} PartiesDeps
 * @property {Object} cache
 * @property {Object} proxyCache
 * @property {Object} log
 * @property {Object} config
 * @property {Object} oracle
 * @property {Object} participant
 * @property {Proxies} proxies
 * @property {Object} partiesUtils
 * @property {Object} [childSpan]
 */

/**
 * Input parameters from party lookup request
 *
 * @typedef {Object} PartiesInputs
 * @property {Object} headers - incoming http request headers.
 * @property {Object} params - uri parameters of the http request.
 * @property {Object} [payload] - payload of the request being sent out.
 * @property {Object} [query] - uri query parameters of the http request
 * @property {string} [dataUri] - encoded payload of the request being sent out.
 */

/**
 * Any calculated values we get during request processing
 *
 * @typedef {Object} PartiesModelState
 * @property {string} destination - The destination DFSP ID from headers
 * @property {string} source - The source DFSP ID from headers
 * @property {string} [proxy] - The proxy DFSP ID from headers, if present
 * @property {string} requester - The entity initiating the request (either a DFSP in scheme or a proxy)
 * @property {boolean} proxyEnabled - Indicates whether proxy functionality is enabled in the current configuration
 * @property {StepState} stepState - Processing steps state
 */

class BasePartiesService {
  #deps // see PartiesDeps
  #inputs // see PartiesInputs
  #state // see PartiesModelState

  /**
   * @param {PartiesDeps} deps - The dependencies required by the class instance.
   * @param {PartiesInputs} inputs - The input parameters from incoming http request.
   * @return {void}
   */
  constructor (deps, inputs) {
    this.#deps = Object.freeze(deps)
    this.#inputs = Object.freeze(inputs)
    this.#state = this.#initiateState()
    this.log = this.deps.log.child({
      component: this.constructor.name,
      params: this.inputs.params
    })
  }

  /** @returns {PartiesDeps} */
  get deps () { return this.#deps }

  /** @returns {PartiesInputs} */
  get inputs () { return this.#inputs }

  /** @returns {PartiesModelState} */
  get state () { return this.#state }

  async handleError (error) {
    const { params } = this.inputs
    const log = this.log.child({ method: 'handleError' })
    try {
      log.error('error in processing parties request: ', error)
      const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(error)
      const callbackHeaders = BasePartiesService.createErrorCallbackHeaders(this.inputs.headers, params)
      const errorInfo = await this.deps.partiesUtils.makePutPartiesErrorPayload(this.deps.config, fspiopError, callbackHeaders, params)

      await this.sendErrorCallback({
        errorInfo,
        headers: callbackHeaders,
        params
      })
      log.info('handleError in done')
      return fspiopError
    } catch (exc) {
      // We can't do anything else here- we _must_ handle all errors _within_ this function because
      // we've already sent a sync response- we cannot throw.
      log.error('failed to handleError. No further processing! ', exc)
    }
  }

  async validateParticipant (participantId) {
    try {
      this.stepInProgress('validateParticipant')
      return this.deps.participant.validateParticipant(participantId)
    } catch (err) {
      this.log.warn(`error in validateParticipant ${participantId}: `, err)
      return null
    }
  }

  async identifyDestinationForCallback () {
    this.stepInProgress('identifyDestinationForCallback')
    const { destination } = this.state

    const schemeParticipant = await this.validateParticipant(destination)
    if (schemeParticipant) {
      this.state.requester = destination
      return
    }

    const proxyName = this.state.proxyEnabled && await this.deps.proxyCache.lookupProxyByDfspId(destination)
    if (proxyName) {
      this.state.requester = proxyName
      return
    }

    const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
    this.log.warn(`${errMessage} and no proxy`, { destination })
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
  }

  async sendErrorCallback ({ errorInfo, headers, params }) {
    this.stepInProgress('sendErrorCallback')
    const sendTo = this.state.requester || headers[Headers.FSPIOP.DESTINATION] /* || this.state.source */
    const endpointType = this.deps.partiesUtils.errorPartyCbType(params.SubId)

    await this.deps.participant.sendErrorToParticipant(
      sendTo, endpointType, errorInfo, headers, params, undefined, this.deps.childSpan
    )
    this.log.info('sendErrorCallback is done', { sendTo, errorInfo })
  }

  async sendDeleteOracleRequest (headers, params) {
    this.stepInProgress('sendDeleteOracleRequest')
    return this.deps.oracle.oracleRequest(headers, RestMethods.DELETE, params, null, null, this.deps.cache)
  }

  async removeProxyGetPartiesTimeoutCache (alsReq) {
    this.stepInProgress('removeProxyGetPartiesTimeoutCache')
    const isRemoved = await this.deps.proxyCache.removeProxyGetPartiesTimeout(alsReq, this.state.proxy)
    this.log.debug('removeProxyGetPartiesTimeoutCache is done', { isRemoved, alsReq })
    return isRemoved
  }

  createFspiopIdNotFoundError (errMessage, log = this.log) {
    log.warn(errMessage)
    return ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ID_NOT_FOUND, errMessage)
  }

  createFspiopPartyNotFoundError (errMessage, log = this.log) {
    log.warn(errMessage)
    return ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND, errMessage)
  }

  createFspiopServiceUnavailableError (errMessage, log = this.log) {
    log.warn(errMessage)
    return ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.SERVICE_CURRENTLY_UNAVAILABLE, errMessage)
  }

  stepInProgress (stepName) {
    this.log.debug('step is in progress', { stepName })
    this.state.stepState?.inProgress(stepName)
  }

  get currenStep () {
    return this.state.stepState?.step
  }

  /** @returns {PartiesModelState} */
  #initiateState () {
    const { headers } = this.inputs
    return {
      destination: headers[Headers.FSPIOP.DESTINATION],
      source: headers[Headers.FSPIOP.SOURCE],
      proxy: headers[Headers.FSPIOP.PROXY],
      requester: '', // dfsp in scheme  OR  proxy
      proxyEnabled: !!(this.deps.config.PROXY_CACHE_CONFIG?.enabled && this.deps.proxyCache),
      stepState: initStepState()
    }
  }

  static decodeDataUriPayload (dataUri) {
    const decoded = decodePayload(dataUri, { asParsed: false })
    return decoded.body.toString()
  }

  static headersWithoutDestination (headers) {
    const { [Headers.FSPIOP.DESTINATION]: _, ...restHeaders } = headers || {}
    return restHeaders
  }

  static overrideDestinationHeader (headers, destination) {
    return {
      ...BasePartiesService.headersWithoutDestination(headers),
      ...(destination && { [Headers.FSPIOP.DESTINATION]: destination })
    }
  }

  static createErrorCallbackHeaders (headers, params, overrideDestination = '') {
    const cbHeaders = createCallbackHeaders({
      requestHeaders: headers,
      partyIdType: params.Type,
      partyIdentifier: params.ID,
      endpointTemplate: params.SubId
        ? FspEndpointTemplates.PARTIES_SUB_ID_PUT_ERROR
        : FspEndpointTemplates.PARTIES_PUT_ERROR
    })
    if (overrideDestination) {
      cbHeaders[Headers.FSPIOP.DESTINATION] = overrideDestination
    }
    return cbHeaders
  }

  static createHubErrorCallbackHeaders (hubName, destination) {
    return {
      [Headers.FSPIOP.SOURCE]: hubName,
      [Headers.FSPIOP.DESTINATION]: destination,
      [Headers.GENERAL.CONTENT_TYPE.value]: makeAcceptContentTypeHeader(
        'parties',
        config.PROTOCOL_VERSIONS.CONTENT.DEFAULT.toString(),
        config.API_TYPE
      )
    }
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
