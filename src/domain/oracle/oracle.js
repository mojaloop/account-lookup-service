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

const Logger = require('@mojaloop/central-services-logger')
const oracleEndpoint = require('../../models/oracle')
const partyIdType = require('../../models/partyIdType')
const endpointType = require('../../models/endpointType')
const currency = require('../../models/currency')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

/**
 * @function createOracle
 *
 * @description This creates and entry in the oracleEndpoint table
 *
 * @param {object} payload The payload from the Hapi server request
 */
exports.createOracle = async (payload) => {
  try {
    const oracleEntity = {}
    if (payload.isDefault) {
      oracleEntity.isDefault = payload.isDefault
    } else {
      oracleEntity.isDefault = false
    }
    if (payload.currency) {
      oracleEntity.currencyId = payload.currency
    }
    oracleEntity.value = payload.endpoint.value
    oracleEntity.createdBy = 'Admin'
    const partyIdTypeModel = await partyIdType.getPartyIdTypeByName(payload.oracleIdType)
    const endpointTypeModel = await endpointType.getEndpointTypeByType(payload.endpoint.endpointType)
    oracleEntity.partyIdTypeId = partyIdTypeModel.partyIdTypeId
    oracleEntity.endpointTypeId = endpointTypeModel.endpointTypeId
    await oracleEndpoint.createOracleEndpoint(oracleEntity)
    return true
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * @function getOracle
 *
 * @description Retrieves list of oracles may accept query parameters
 *
 * @param {object} query The query parameters from the Hapi server request
 */
exports.getOracle = async (query) => {
  try {
    let oracleEndpointModelList
    let isCurrency; let isType = false
    const oracleList = []
    if (query.currency) {
      isCurrency = true
    }
    if (query.type) {
      isType = true
    }
    if (isCurrency && isType) {
      oracleEndpointModelList = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(query.type, query.currency)
    } else if (isCurrency && !isType) {
      oracleEndpointModelList = await oracleEndpoint.getOracleEndpointByCurrency(query.currency)
    } else if (isType && !isCurrency) {
      oracleEndpointModelList = await oracleEndpoint.getOracleEndpointByType(query.type)
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
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * @function updateOracle
 *
 * @description This process updates properties of oracle entries
 *
 * @param {object} params The parameters from the Hapi server request
 * @param {object} payload The payload from the Hapi server request
 */
exports.updateOracle = async (params, payload) => {
  try {
    const currentOracleEndpointList = await oracleEndpoint.getOracleEndpointById(params.ID)
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
          throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Invalid currency code').toApiErrorObject()
        }
      }
      if (payload.isDefault && payload.isDefault !== currentOracleEndpoint.isDefault) {
        newOracleEntry.isDefault = payload.isDefault
      }
      await oracleEndpoint.updateOracleEndpointById(params.ID, newOracleEntry)
      return true
    } else {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, 'Oracle not found')
    }
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * @function deleteOracle
 *
 * @description This process deletes an oracle endpoint by setting
 *
 * @param {object} params The parameters from the Hapi server request
 */
exports.deleteOracle = async (params) => {
  try {
    await oracleEndpoint.destroyOracleEndpointById(params.ID)
    return true
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}
