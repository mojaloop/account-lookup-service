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

const request = require('../../lib/request')
const oracleEndpoint = require('../oracle')
const Mustache = require('mustache')
const Logger = require('@mojaloop/central-services-shared').Logger
const Enums = require('../../lib/enum')

/**
 * @function oracleRequest
 *
 * @description This sends a request to the oracles that are registered to the ALS
 *
 * @param {object} req - The request that is being passed in
 *
 * @returns {object} returns the response from the oracle
 */
exports.oracleRequest = async (req) => {
  let oracleEndpointModel
  const type = req.params.Type
  let url
  if ((req.payload && req.payload.currency && req.payload.currency.length !== 0) || (req.query && req.query.currency && req.query.currency.length !== 0)) {
    oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(type, req.query.currency || req.payload.currency)
    url = Mustache.render(oracleEndpointModel[0].value + Enums.endpoints.oracleParticipantsTypeIdCurrency, {
      partyIdType: type,
      partyIdentifier: req.params.ID,
      currency: req.query.currency || req.payload.currency
    })
  } else {
    oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
    url = Mustache.render(oracleEndpointModel[0].value + Enums.endpoints.oracleParticipantsTypeId, {
      partyIdType: type,
      partyIdentifier: req.params.ID
    })
  }
  Logger.debug(`Oracle endpoints: ${url}`)
  return await request.sendRequest(url, req.headers, req.method, req.payload || undefined, true)
}

/**
 * @function oracleBatchRequest
 *
 * @description This sends a request to the oracles that are registered to the ALS
 *
 * @param {object} req - The request that is being passed in
 * @param {string} type - oracle type
 * @param {object} payload - the payload to send in the request
 *
 * @returns {object} returns the response from the oracle
 */
exports.oracleBatchRequest = async (req, type, payload) => {
  let oracleEndpointModel
  oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
  let url = oracleEndpointModel[0].value + Enums.endpoints.oracleParticipantsBatch
  Logger.debug(`Oracle endpoints: ${url}`)
  return await request.sendRequest(url, req.headers, req.method, payload || undefined, true)
}