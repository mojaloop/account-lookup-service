/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the 2020-2025 Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation
 * Name Surname <name.surname@mojaloop.io>

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/

'use strict'

const Mustache = require('mustache')
const request = require('@mojaloop/central-services-shared').Util.Request
const Enums = require('@mojaloop/central-services-shared').Enum
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Metrics = require('@mojaloop/central-services-metrics')

const Config = require('../../lib/config')
const { logger } = require('../../lib')
const { countFspiopError } = require('../../lib/util')
const { hubNameRegex } = require('../../lib/util').hubNameConfig
const oracleEndpointCached = require('../oracle/oracleEndpointCached')

const { Headers, RestMethods, ReturnCodes } = Enums.Http

/**
 * Sends a request to the oracles that are registered to the ALS
 *
 * @param {object} headers - incoming http request headers
 * @param {string} method - incoming http request method
 * @param {object} params - uri parameters of the http request
 * @param {object} query - the query parameter on the uri of the http request
 * @param {object} payload - payload of the request being sent out
 * @param {object} assertPendingAcquire - flag to check DB pool pending acquire limit
 *
 * @returns {object} - response from the oracle
 */
const oracleRequest = async (headers, method, params = {}, query = {}, payload = undefined, cache, assertPendingAcquire) => {
  const operation = oracleRequest.name
  const log = logger.child({ component: operation, params })
  let step = 'start'

  try {
    const source = headers[Headers.FSPIOP.SOURCE]
    const destination = headers[Headers.FSPIOP.DESTINATION] || Config.HUB_NAME
    const partySubIdOrType = params?.SubId || query?.partySubIdOrType
    log.info('oracleRequest start...', { method, source, destination })

    step = 'determineOracleEndpoint'
    const url = await determineOracleEndpoint({
      method, params, query, payload, assertPendingAcquire
    })
    log.verbose(`Oracle endpoint: ${url}`)

    if (method.toUpperCase() === RestMethods.GET) {
      step = 'sendOracleGetRequest'
      return await sendOracleGetRequest({
        url, source, destination, headers, method, params, cache
      })
    }

    if (partySubIdOrType && payload) payload.partySubIdOrType = partySubIdOrType

    if (method.toUpperCase() === RestMethods.DELETE && Config.DELETE_PARTICIPANT_VALIDATION_ENABLED) {
      step = 'validatePartyDeletion'
      await validatePartyDeletion({
        url, source, destination, headers, method, params, payload
      })
    }

    step = 'sendRequest'
    return await request.sendRequest({
      url,
      headers,
      source,
      destination,
      method,
      payload,
      hubNameRegex
    })
  } catch (err) {
    log.error('error in oracleRequest: ', err)
    throw countFspiopError(err, { operation, step, log })
  }
}

const determineOracleEndpoint = async ({
  method, params, query, payload, assertPendingAcquire
}) => {
  const partyIdType = params.Type
  const partyIdentifier = params.ID
  const partySubIdOrType = params?.SubId || query?.partySubIdOrType
  const currency = payload?.currency || query?.currency
  const isGetRequest = method.toUpperCase() === RestMethods.GET
  let url

  if (currency && partySubIdOrType && isGetRequest) {
    url = await _getOracleEndpointByTypeCurrencyAndSubId(partyIdType, partyIdentifier, currency, partySubIdOrType, assertPendingAcquire)
  } else if (currency && isGetRequest) {
    url = await _getOracleEndpointByTypeAndCurrency(partyIdType, partyIdentifier, currency, assertPendingAcquire)
  } else if (partySubIdOrType && isGetRequest) {
    url = await _getOracleEndpointByTypeAndSubId(partyIdType, partyIdentifier, partySubIdOrType, assertPendingAcquire)
  } else {
    url = await _getOracleEndpointByType(partyIdType, partyIdentifier, assertPendingAcquire)
  }
  return url
}

const sendOracleGetRequest = async ({
  url, source, destination, headers, method, params, cache
}) => {
  const histTimerEnd = Metrics.getHistogram(
    'egress_oracleRequest',
    'Egress: oracleRequest',
    ['success', 'hit']
  ).startTimer()
  const log = logger.child({ component: 'sendOracleGetRequest', params })

  try {
    let cachedOracleFspResponse
    cachedOracleFspResponse = cache && cache.get(cache.createKey(`oracleSendRequest_${url}`))

    if (!cachedOracleFspResponse) {
      cachedOracleFspResponse = await request.sendRequest({
        url,
        headers,
        source,
        destination,
        method,
        hubNameRegex
      })
      // Trying to cache the whole response object will fail because it contains circular references
      // so we'll just cache the data property of the response.
      cachedOracleFspResponse = {
        data: cachedOracleFspResponse.data
      }
      cache && cache.set(
        cache.createKey(`oracleSendRequest_${url}`),
        cachedOracleFspResponse
      )
      histTimerEnd({ success: true, hit: false })
    } else {
      cachedOracleFspResponse = cachedOracleFspResponse.item
      histTimerEnd({ success: true, hit: true })
      logger.debug('[oracleRequest]: cache hit for fsp for partyId lookup')
    }

    return cachedOracleFspResponse
  } catch (err) {
    log.warn('error in sendOracleGetRequest: ', err)
    histTimerEnd({ success: false, hit: false })

    // If the error was a 400 from the Oracle, we'll modify the error to generate a response to the
    // initiator of the request.
    if (
      err.name === 'FSPIOPError' &&
      err.apiErrorCode.code === ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_COMMUNICATION_ERROR.code
    ) {
      const extensions = [{
        key: 'system',
        value: '["@hapi/catbox-memory","http"]'
      }]
      if (err.extensions.some(ext => (ext.key === 'status' && ext.value === ReturnCodes.BADREQUEST.CODE))) {
        throw ErrorHandler.Factory.createFSPIOPError(
          ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND,
          undefined,
          undefined,
          undefined,
          extensions
        )
      }
      // Added error 404 to cover a special case of the Mowali implementation
      // which uses mojaloop/als-oracle-pathfinder and currently returns 404
      // and in which case the Mowali implementation expects back `DESTINATION_FSP_ERROR`.
      if (err.extensions.some(ext => (ext.key === 'status' && ext.value === ReturnCodes.NOTFOUND.CODE))) {
        throw ErrorHandler.Factory.createFSPIOPError(
          ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR,
          undefined,
          undefined,
          undefined,
          extensions
        )
      }
    }

    throw err
  }
}

const validatePartyDeletion = async ({
  url, source, destination, headers, method, params, payload
}) => {
  const log = logger.child({ component: 'validatePartyDeletion', params })
  // If the request is a DELETE request, we need to ensure that the participant belongs to the requesting FSP
  const getParticipantResponse = await request.sendRequest({
    url,
    headers,
    source,
    destination,
    method,
    payload,
    hubNameRegex
  })

  if (getParticipantResponse.status !== ReturnCodes.OK.CODE) {
    const errMessage = `Invalid getOracleResponse status code: ${getParticipantResponse.status}`
    log.warn(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND, errMessage)
    // todo: clarify if we need to throw PARTY_NOT_FOUND
  }

  const participant = getParticipantResponse.data
  if (!Array.isArray(participant?.partyList) || participant.partyList.length === 0) {
    const errMessage = 'No participant found for the party'
    log.warn(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DELETE_PARTY_INFO_ERROR, errMessage)
  }

  const party = participant.partyList[0] // todo: clarify why we check only the first party?
  if (party.fspId !== source) {
    const errMessage = `The party ${params.Type}:${params.ID} does not belong to the requesting FSP`
    log.warn(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DELETE_PARTY_INFO_ERROR, errMessage)
  }
  return true
}

/**
 * @function _getOracleEndpointByTypeAndCurrency
 *
 * @description Retirieves and returns the URL to an oracle by partyIdType and currency
 *
 * @param {string} partyIdType - party ID type (e.g MSISDN)
 * @param {string} partyIdentifier - party ID
 * @param {string} currency - currency ID
 * @param {object} assertPendingAcquire - flag to check DB pool pending acquire limit
 *
 * @returns {string} returns the endpoint to the oracle
 */
const _getOracleEndpointByTypeAndCurrency = async (partyIdType, partyIdentifier, currency, assertPendingAcquire) => {
  let url
  const oracleEndpointModel = await oracleEndpointCached.getOracleEndpointByTypeAndCurrency(partyIdType, currency, assertPendingAcquire)
  if (oracleEndpointModel.length > 0) {
    if (oracleEndpointModel.length > 1) {
      const defautOracle = oracleEndpointModel.filter(oracle => oracle.isDefault).pop()
      if (defautOracle) {
        url = Mustache.render(
          defautOracle.value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_CURRENCY,
          { partyIdType, partyIdentifier, currency }
        )
      }
    } else {
      url = Mustache.render(
        oracleEndpointModel[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_CURRENCY,
        { partyIdType, partyIdentifier, currency }
      )
    }
  } else {
    const errMessage = `Oracle type:${partyIdType} and currency:${currency} not found`
    logger.error(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, errMessage)
      .toApiErrorObject(Config.ERROR_HANDLING)
  }
  return url
}

/**
 * @function _getOracleEndpointByType
 *
 * @description Retrieves and returns the URL to an oracle by partyIdType
 *
 * @param {string} partyIdType - party ID type (e.g MSISDN)
 * @param {string} partyIdentifier - party ID
 * @param {object} assertPendingAcquire - flag to check DB pool pending acquire limit
 *
 * @returns {string} returns the endpoint to the oracle
 */
const _getOracleEndpointByType = async (partyIdType, partyIdentifier, assertPendingAcquire) => {
  let url
  const oracleEndpointModel = await oracleEndpointCached.getOracleEndpointByType(partyIdType, assertPendingAcquire)
  if (oracleEndpointModel.length > 0) {
    if (oracleEndpointModel.length > 1) {
      const defaultOracle = oracleEndpointModel.filter(oracle => oracle.isDefault).pop()
      if (defaultOracle) {
        url = Mustache.render(
          defaultOracle.value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID,
          { partyIdType, partyIdentifier }
        )
      }
    } else {
      url = Mustache.render(
        oracleEndpointModel[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID,
        { partyIdType, partyIdentifier }
      )
    }
  } else {
    const errMessage = `Oracle type:${partyIdType} not found`
    logger.error(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, errMessage)
  }
  return url
}

/**
 * @function _getOracleEndpointByTypeAndSubId
 *
 * @description Retrieves and returns the URL to an oracle by partyIdType and subId
 *
 * @param {string} partyIdType - party ID type (e.g MSISDN)
 * @param {string} partyIdentifier - party ID
 * @param {string} partySubIdOrType - party subId
 * @param {object} assertPendingAcquire - flag to check DB pool pending acquire limit
 *
 * @returns {string} returns the endpoint to the oracle
 */
const _getOracleEndpointByTypeAndSubId = async (partyIdType, partyIdentifier, partySubIdOrType, assertPendingAcquire) => {
  let url
  const oracleEndpointModel = await oracleEndpointCached.getOracleEndpointByType(partyIdType, assertPendingAcquire)
  if (oracleEndpointModel.length > 0) {
    if (oracleEndpointModel.length > 1) {
      const defautOracle = oracleEndpointModel.filter(oracle => oracle.isDefault).pop()
      if (defautOracle) {
        url = Mustache.render(
          defautOracle.value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_SUB_ID,
          { partyIdType, partyIdentifier, partySubIdOrType }
        )
      }
    } else {
      url = Mustache.render(
        oracleEndpointModel[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_SUB_ID,
        { partyIdType, partyIdentifier, partySubIdOrType }
      )
    }
  } else {
    const errMessage = `Oracle type: ${partyIdType} and subId: ${partySubIdOrType} not found`
    logger.error(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, errMessage)
      .toApiErrorObject(Config.ERROR_HANDLING)
  }
  return url
}

/**
 * @function _getOracleEndpointByTypeCurrencyAndSubId
 *
 * @description Retirieves and returns the URL to an oracle by partyIdType and currency
 *
 * @param {string} partyIdType - party ID type (e.g MSISDN)
 * @param {string} partyIdentifier - party ID
 * @param {string} currency - currency ID
 * @param {string} partySubIdOrType - party subId
 * @param {object} assertPendingAcquire - flag to check DB pool pending acquire limit
 *
 * @returns {string} returns the endpoint to the oracle
 */
const _getOracleEndpointByTypeCurrencyAndSubId = async (partyIdType, partyIdentifier, currency, partySubIdOrType, assertPendingAcquire) => {
  let url
  const oracleEndpointModel = await oracleEndpointCached.getOracleEndpointByTypeAndCurrency(partyIdType, currency, assertPendingAcquire)
  if (oracleEndpointModel.length > 0) {
    if (oracleEndpointModel.length > 1) {
      const defautOracle = oracleEndpointModel.filter(oracle => oracle.isDefault).pop()
      if (defautOracle) {
        url = Mustache.render(
          defautOracle.value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_CURRENCY_SUB_ID,
          { partyIdType, partyIdentifier, currency, partySubIdOrType }
        )
      }
    } else {
      url = Mustache.render(
        oracleEndpointModel[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_CURRENCY_SUB_ID,
        { partyIdType, partyIdentifier, currency, partySubIdOrType }
      )
    }
  } else {
    const errMessage = `Oracle type: ${partyIdType}, currency: ${currency} and subId: ${partySubIdOrType} not found`
    logger.error(errMessage)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, errMessage)
      .toApiErrorObject(Config.ERROR_HANDLING)
  }
  return url
}

/**
 * Sends a request to the oracles that are registered to the ALS
 *
 * @param {object} headers - incoming http request headers
 * @param {object} method - incoming http request method
 * @param {object} requestPayload - the requestPayload from the original request
 * @param {string} type - oracle type
 * @param {object} payload - the payload to send in the request
 *
 * @returns {object} - response from the oracle
 */
const oracleBatchRequest = async (headers, method, requestPayload, type, payload) => {
  try {
    let oracleEndpointModel
    let url
    if ((requestPayload && requestPayload.currency && requestPayload.currency.length !== 0)) {
      oracleEndpointModel = await oracleEndpointCached.getOracleEndpointByTypeAndCurrency(type, requestPayload.currency)
    } else {
      oracleEndpointModel = await oracleEndpointCached.getOracleEndpointByType(type)
    }
    if (oracleEndpointModel.length > 0) {
      if (oracleEndpointModel.length > 1) {
        for (const record of oracleEndpointModel) {
          if (record.isDefault) {
            url = record.value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_BATCH
            break
          }
        }
      } else {
        url = oracleEndpointModel[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_BATCH
      }
      logger.debug(`Oracle endpoints: ${url}`)
      return await request.sendRequest({
        url,
        headers,
        source: headers[Headers.FSPIOP.SOURCE],
        destination: headers[Headers.FSPIOP.DESTINATION] || Config.HUB_NAME,
        method,
        payload,
        hubNameRegex
      })
    } else {
      logger.error(`Oracle type:${type} not found`)
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, `Oracle type:${type} not found`)
    }
  } catch (err) {
    logger.error('error in oracleBatchRequest: ', err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

module.exports = {
  oracleRequest,
  oracleBatchRequest
}
