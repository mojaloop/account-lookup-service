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
 --------------
 ******/

'use strict'

const request = require('@mojaloop/central-services-shared').Util.Request
const oracleEndpoint = require('../oracle')
const Mustache = require('mustache')
const Logger = require('@mojaloop/central-services-shared').Logger
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
    let oracleEndpointModel
    const type = params.Type
    let url
    if (((payload && payload.currency && payload.currency.length !== 0) || (query && query.currency && query.currency.length !== 0)) && method.toUpperCase() === Enums.Http.RestMethods.GET) {
      oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(type, query.currency || payload.currency)
      if (oracleEndpointModel.length > 0) {
        if (oracleEndpointModel.length > 1) {
          for (const record of oracleEndpointModel) {
            if (record.isDefault) {
              url = Mustache.render(record.value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_CURRENCY, {
                partyIdType: type,
                partyIdentifier: params.ID,
                currency: query.currency || payload.currency
              })
              break
            }
          }
        } else {
          url = Mustache.render(oracleEndpointModel[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_CURRENCY, {
            partyIdType: type,
            partyIdentifier: params.ID,
            currency: query.currency || payload.currency
          })
        }
      } else {
        Logger.error(`Oracle type:${type} and currency:${query.currency || payload.currency} not found`)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, `Oracle type:${type} and currency:${query.currency || payload.currency} not found`).toApiErrorObject()
      }
    } else {
      oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
      if (oracleEndpointModel.length > 0) {
        if (oracleEndpointModel.length > 1) {
          for (const record of oracleEndpointModel) {
            if (record.isDefault) {
              url = Mustache.render(record.value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID, {
                partyIdType: type,
                partyIdentifier: params.ID
              })
              break
            }
          }
        } else {
          url = Mustache.render(oracleEndpointModel[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID, {
            partyIdType: type,
            partyIdentifier: params.ID
          })
        }
      } else {
        Logger.error(`Oracle type:${type} not found`)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, `Oracle type:${type} not found`)
      }
    }
    Logger.debug(`Oracle endpoints: ${url}`)
    return await request.sendRequest(url, headers, headers[Enums.Http.Headers.FSPIOP.SOURCE], headers[Enums.Http.Headers.FSPIOP.DESTINATION] || Enums.Http.Headers.FSPIOP.SWITCH.value, method.toUpperCase(), payload || undefined)
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
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
