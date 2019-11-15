/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 * Name Surname <name.surname@gatesfoundation.com>

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/

'use strict'

const request = require('@mojaloop/central-services-shared').Util.Request
const oracleEndpoint = require('../oracle')
const Mustache = require('mustache')
const Logger = require('@mojaloop/central-services-logger')
const Enums = require('@mojaloop/central-services-shared').Enum
const ErrorHandler = require('@mojaloop/central-services-error-handling')

/**
 * @function oracleRequest
 *
 * @description This sends a request to the oracles that are registered to the ALS
 *
 * @param {object} headers - incoming http request headers
 * @param {string} method - incoming http request method
 * @param {object} params - uri parameters of the http request
 * @param {object} query - the query parameter on the uri of the http request
 * @param {object} payload - payload of the request being sent out
 *
 * @returns {object} returns the response from the oracle
 */
exports.oracleRequest = async (headers, method, params = {}, query = {}, payload = undefined) => {
  try {
    let url
    const partyIdType = params.Type
    const partyIdentifier = params.ID
    const currency = (payload && payload.currency) ? payload.currency : (query && query.currency) ? query.currency : undefined
    const partySubIdOrType = (payload && payload.partySubIdOrType) ? payload.partySubIdOrType : (query && query.partySubIdOrType) ? query.partySubIdOrType : undefined
    const isGetRequest = method.toUpperCase() === Enums.Http.RestMethods.GET
    if (currency && partySubIdOrType && isGetRequest) {
      url = await _getOracleEndpointByTypeCurrencyAndSubId(partyIdType, partyIdentifier, currency, partySubIdOrType)
    } else if (currency && isGetRequest) {
      url = await _getOracleEndpointByTypeAndCurrency(partyIdType, partyIdentifier, currency)
    } else if (partySubIdOrType && isGetRequest) {
      url = await _getOracleEndpointByTypeAndSubId(partyIdType, partyIdentifier, partySubIdOrType)
    } else {
      url = await _getOracleEndpointByType(partyIdType)
    }
    Logger.debug(`Oracle endpoints: ${url}`)
    return await request.sendRequest(url, headers, headers[Enums.Http.Headers.FSPIOP.SOURCE], headers[Enums.Http.Headers.FSPIOP.DESTINATION] || Enums.Http.Headers.FSPIOP.SWITCH.value, method.toUpperCase(), payload || undefined)
  } catch (err) {
    Logger.error(err)
    // If the error was a 400 from the Oracle, we'll modify the error to generate a response to the
    // initiator of the request.
    if (
      err.name === 'FSPIOPError' &&
      err.apiErrorCode.code === ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_COMMUNICATION_ERROR.code &&
      err.extensions.some(ext => (ext.key === 'status' && ext.value === Enums.Http.ReturnCodes.BADREQUEST.CODE))
    ) {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.PARTY_NOT_FOUND)
    }
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * @function _getOracleEndpointByTypeAndCurrency
 *
 * @description Retirieves and returns the URL to an oracle by partyIdType and currency
 *
 * @param {string} partyIdType - party ID type (e.g MSISDN)
 * @param {string} partyIdentifier - party ID
 * @param {string} currency - currency ID
 *
 * @returns {string} returns the endpoint to the oracle
 */
const _getOracleEndpointByTypeAndCurrency = async (partyIdType, partyIdentifier, currency) => {
  let url
  const oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(partyIdType, currency)
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
    Logger.error(`Oracle type:${partyIdType} and currency:${currency} not found`)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, `Oracle type:${partyIdType} and currency:${currency} not found`).toApiErrorObject()
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
 *
 * @returns {string} returns the endpoint to the oracle
 */
const _getOracleEndpointByType = async (partyIdType, partyIdentifier) => {
  let url
  const oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(partyIdType)
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
    Logger.error(`Oracle type:${partyIdType} not found`)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, `Oracle type: ${partyIdType} not found`)
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
 *
 * @returns {string} returns the endpoint to the oracle
 */
const _getOracleEndpointByTypeAndSubId = async (partyIdType, partyIdentifier, partySubIdOrType) => {
  let url
  const oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(partyIdType)
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
    Logger.error(`Oracle type: ${partyIdType} and subId: ${partySubIdOrType} not found`)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, `Oracle type: ${partyIdType} and subId: ${partySubIdOrType} not found`).toApiErrorObject()
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
 *
 * @returns {string} returns the endpoint to the oracle
 */
const _getOracleEndpointByTypeCurrencyAndSubId = async (partyIdType, partyIdentifier, currency, partySubIdOrType) => {
  let url
  const oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(partyIdType, currency)
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
    Logger.error(`Oracle type: ${partyIdType}, currency: ${currency}, and subId: ${partySubIdOrType} not found`)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, `Oracle type:${partyIdType}, currency:${currency} and subId: ${partySubIdOrType} not found`).toApiErrorObject()
  }
  return url
}

/**
 * @function oracleBatchRequest
 *
 * @description This sends a request to the oracles that are registered to the ALS
 *
 * @param {object} headers - incoming http request headers
 * @param {object} method - incoming http request method
 * @param {object} requestPayload - the requestPayload from the original request
 * @param {string} type - oracle type
 * @param {object} payload - the payload to send in the request
 *
 * @returns {object} returns the response from the oracle
 */
exports.oracleBatchRequest = async (headers, method, requestPayload, type, payload) => {
  try {
    let oracleEndpointModel
    let url
    if ((requestPayload && requestPayload.currency && requestPayload.currency.length !== 0)) {
      oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(type, requestPayload.currency)
    } else {
      oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
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
      Logger.debug(`Oracle endpoints: ${url}`)
      return await request.sendRequest(url, headers, headers[Enums.Http.Headers.FSPIOP.SOURCE], headers[Enums.Http.Headers.FSPIOP.DESTINATION] || Enums.Http.Headers.FSPIOP.SWITCH.value, method, payload || undefined)
    } else {
      Logger.error(`Oracle type:${type} not found`)
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, `Oracle type:${type} not found`)
    }
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}
