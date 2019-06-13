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
 - Name Surname <name.surname@gatesfoundation.com>

 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 - Name Surname <name.surname@gatesfoundation.com>

 --------------
 ******/
'use strict'

const Logger = require('@mojaloop/central-services-shared').Logger
const oracleEndpoint = require('../../models/oracle')
const partyIdType = require('../../models/partyIdType')
const endpointType = require('../../models/endpointType')
const currency = require('../../models/currency')

/**
 * @function createOracle
 *
 * @description This creates and entry in the oracleEndpoint table
 *
 * @param {object} req The request object from the Hapi server
 */
exports.createOracle = async (req) => {
  try {
    const oracleEntity = {}
    const payload = req.payload
    if(payload.isDefault){
      oracleEntity.isDefault = payload.isDefault
    } else {
      oracleEntity.isDefault = false
    }
    if(payload.currency){
      oracleEntity.currencyId = payload.currency
    }
    oracleEntity.value = payload.endpoint.value
    oracleEntity.createdBy =  'Admin'
    const partyIdTypeModel = await partyIdType.getPartyIdTypeByName(payload.oracleIdType)
    const endpointTypeModel = await endpointType.getEndpointTypeByType(payload.endpoint.endpointType)
    oracleEntity.partyIdTypeId = partyIdTypeModel.partyIdTypeId
    oracleEntity.endpointTypeId = endpointTypeModel.endpointTypeId
    await oracleEndpoint.createOracleEndpoint(oracleEntity)
    return true
  } catch (e) {
    Logger.error(e)
    throw e
  }
}

/**
 * @function getOracle
 *
 * @description Retrieves list of oracles may accept query parameters
 *
 * @param {object} req The request object from the Hapi server
 */
exports.getOracle = async (req) => {
  try {
    let oracleEndpointModelList
    let isCurrency, isType = false
    const oracleList = []
    if (req.query.currency) {
      isCurrency = true
    }
    if (req.query.type) {
      isType = true
    }
    if (isCurrency && isType){
      oracleEndpointModelList = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(req.query.type, req.query.currency)
    } else if (isCurrency && !isType){
      oracleEndpointModelList = await oracleEndpoint.getOracleEndpointByCurrency(req.query.currency)
    } else if (isType && !isCurrency) {
      oracleEndpointModelList = await oracleEndpoint.getOracleEndpointByType(req.query.type)
    } else {
      oracleEndpointModelList = await oracleEndpoint.getAllOracleEndpoint()
    }
    for (const oracleEndpointModel of oracleEndpointModelList) {
      const oracle = {
        oracleId: oracleEndpointModel.oracleEndpointId,
        oracleIdType: oracleEndpointModel.idType,
        endpoint: {
          value: oracleEndpointModel.value,
          endpointType: oracleEndpointModel.endpointType
        },
        currency: oracleEndpointModel.currency || undefined,
        isDefault: oracleEndpointModel.isDefault
      }
      oracleList.push(oracle)
    }
    return oracleList
  } catch (e) {
    Logger.error(e)
    throw e
  }
}

/**
 * @function updateOracle
 *
 * @description This process updates properties of oracle entries
 *
 * @param {object} req The request object from the Hapi server
 */
exports.updateOracle = async (req) => {
  try {
    const payload = req.payload
    const currentOracleEndpointList = await oracleEndpoint.getOracleEndpointById(req.params.ID)
    if (currentOracleEndpointList.length > 0) {
      const currentOracleEndpoint = currentOracleEndpointList[0]
      const newOracleEntry = {}
      if (payload.oracleIdType && payload.oracleIdType !== currentOracleEndpoint.idType) {
        const partyTypeModel = await partyIdType.getPartyIdTypeByName(payload.oracleIdType)
        newOracleEntry.partyIdTypeId = partyTypeModel.partyIdTypeId
      }
      if (payload.endpoint && payload.endpoint.value && payload.endpoint.value !== currentOracleEndpoint.value) {
        newOracleEntry.value = payload.endpoint.value
      }
      if (payload.endpoint && payload.endpoint.endpointType && payload.endpoint.endpointType !== currentOracleEndpoint.endpointType) {
        const endpointTypeModel = await endpointType.getEndpointTypeByType(payload.endpoint.endpointType)
        newOracleEntry.endpointTypeId = endpointTypeModel.endpointTypeId
      }
      if (payload.currency && payload.currency !== currentOracleEndpoint.currency) {
        const currencyModel = await currency.getCurrencyById(payload.currency)
        if (currencyModel) {
          newOracleEntry.currencyId = payload.currency
        } else {
          throw new Error('Invalid currency code')
        }
      }
      if (payload.isDefault && payload.isDefault !== currentOracleEndpoint.isDefault) {
        newOracleEntry.isDefault = payload.isDefault
      }
      await oracleEndpoint.updateOracleEndpointById(req.params.ID, newOracleEntry)
      return true
    } else {
      throw new Error('Oracle not found')
    }
  } catch (e) {
    Logger.error(e)
    throw e
  }
}

/**
 * @function deleteOracle
 *
 * @description This process deletes an oracle endpoint by setting
 *
 * @param {object} req The request object from the Hapi server
 */
exports.deleteOracle = async (req) => {
  try {
    await oracleEndpoint.destroyOracleEndpointById(req.params.ID)
    return true
  } catch (e) {
    Logger.error(e)
    throw e
  }
}