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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/

'use strict'

const Db = require('../../lib/db')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

const getOracleEndpointByType = async (type) => {
  try {
    return Db.from('oracleEndpoint').query(builder => {
      return builder.innerJoin('endpointType AS et', 'oracleEndpoint.endpointTypeId', 'et.endpointTypeId')
        .innerJoin('partyIdType AS pt', 'oracleEndpoint.partyIdTypeId', 'pt.partyIdTypeId')
        .where({
          'pt.name': type,
          'pt.isActive': 1,
          'oracleEndpoint.isActive': 1,
          'et.isActive': 1
        })
        .select('oracleEndpoint.oracleEndpointId', 'et.type as endpointType', 'oracleEndpoint.value',
          'pt.name as idType', 'oracleEndpoint.currencyId as currency', 'oracleEndpoint.isDefault')
    })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const getOracleEndpointByTypeAndCurrency = async (type, currencyId) => {
  try {
    return Db.from('oracleEndpoint').query(builder => {
      return builder.innerJoin('currency AS cu', 'oracleEndpoint.currencyId', 'cu.currencyId')
        .innerJoin('endpointType AS et', 'oracleEndpoint.endpointTypeId', 'et.endpointTypeId')
        .innerJoin('partyIdType AS pt', 'oracleEndpoint.partyIdTypeId', 'pt.partyIdTypeId')
        .where({
          'pt.name': type,
          'cu.currencyId': currencyId,
          'pt.isActive': 1,
          'oracleEndpoint.isActive': 1,
          'et.isActive': 1
        })
        .select('oracleEndpoint.oracleEndpointId', 'et.type as endpointType', 'oracleEndpoint.value',
          'pt.name as idType', 'oracleEndpoint.currencyId as currency', 'oracleEndpoint.isDefault')
    })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const getOracleEndpointByCurrency = async (currencyId) => {
  try {
    return Db.from('oracleEndpoint').query(builder => {
      return builder.innerJoin('currency AS cu', 'oracleEndpoint.currencyId', 'cu.currencyId')
        .innerJoin('endpointType AS et', 'oracleEndpoint.endpointTypeId', 'et.endpointTypeId')
        .innerJoin('partyIdType AS pt', 'oracleEndpoint.partyIdTypeId', 'pt.partyIdTypeId')
        .where({
          'cu.currencyId': currencyId,
          'pt.isActive': 1,
          'oracleEndpoint.isActive': 1,
          'et.isActive': 1
        })
        .select('oracleEndpoint.oracleEndpointId', 'et.type as endpointType', 'oracleEndpoint.value',
          'pt.name as idType', 'oracleEndpoint.currencyId as currency', 'oracleEndpoint.isDefault')
    })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const getOracleEndpointById = async (oracleEndpointId) => {
  try {
    return Db.from('oracleEndpoint').query(builder => {
      return builder.innerJoin('currency AS cu', 'oracleEndpoint.currencyId', 'cu.currencyId')
        .innerJoin('endpointType AS et', 'oracleEndpoint.endpointTypeId', 'et.endpointTypeId')
        .innerJoin('partyIdType AS pt', 'oracleEndpoint.partyIdTypeId', 'pt.partyIdTypeId')
        .where({
          'oracleEndpoint.oracleEndpointId': oracleEndpointId,
          'pt.isActive': 1,
          'oracleEndpoint.isActive': 1,
          'et.isActive': 1
        })
        .select('oracleEndpoint.oracleEndpointId', 'et.type as endpointType', 'oracleEndpoint.value',
          'pt.name as idType', 'oracleEndpoint.currencyId as currency', 'oracleEndpoint.isDefault')
    })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const getAllOracleEndpoint = async () => {
  try {
    return Db.from('oracleEndpoint').query(builder => {
      return builder.innerJoin('endpointType AS et', 'oracleEndpoint.endpointTypeId', 'et.endpointTypeId')
        .innerJoin('partyIdType AS pt', 'oracleEndpoint.partyIdTypeId', 'pt.partyIdTypeId')
        .where({
          'pt.isActive': 1,
          'oracleEndpoint.isActive': 1,
          'et.isActive': 1
        })
        .select('oracleEndpoint.oracleEndpointId', 'et.type as endpointType', 'oracleEndpoint.value',
          'pt.name as idType', 'oracleEndpoint.currencyId as currency', 'oracleEndpoint.isDefault')
    })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const getAllOracleEndpointsByMatchCondition = async (oracleEndpointModel, partyIdTypeId, endpointTypeId) => {
  try {
    return Db.from('oracleEndpoint').query(builder => {
      return builder.innerJoin('endpointType AS et', 'oracleEndpoint.endpointTypeId', 'et.endpointTypeId')
        .innerJoin('partyIdType AS pt', 'oracleEndpoint.partyIdTypeId', 'pt.partyIdTypeId')
        .where({
          'oracleEndpoint.currencyId': oracleEndpointModel.currency,
          'et.endpointTypeId': endpointTypeId,
          'pt.partyIdTypeId': partyIdTypeId,
          'oracleEndpoint.isActive': 1
        })
        .select('oracleEndpoint.oracleEndpointId', 'et.type as endpointType', 'oracleEndpoint.value',
          'pt.name as idType', 'oracleEndpoint.currencyId as currency', 'oracleEndpoint.isDefault',
          'oracleEndpoint.isActive', 'oracleEndpoint.partyIdTypeId', 'oracleEndpoint.endpointTypeId', 'oracleEndpoint.currencyId')
    })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const createOracleEndpoint = async (oracleEndpointModel) => {
  try {
    return await Db.from('oracleEndpoint').insert(oracleEndpointModel)
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const updateOracleEndpointById = async (id, oracleEndpointModel) => {
  try {
    return await Db.from('oracleEndpoint').update({ oracleEndpointId: id }, oracleEndpointModel)
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const setIsActiveOracleEndpoint = async (oracleType, isActive) => {
  try {
    return await Db.from('oracleEndpoint').update({ oracleType }, { isActive })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const destroyOracleEndpointById = async (oracleEndpointId) => {
  try {
    return await Db.from('oracleEndpoint').update({ oracleEndpointId }, { isActive: false })
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

module.exports = {
  getOracleEndpointByType,
  getOracleEndpointByTypeAndCurrency,
  getOracleEndpointByCurrency,
  getAllOracleEndpoint,
  getOracleEndpointById,
  getAllOracleEndpointsByMatchCondition,
  createOracleEndpoint,
  updateOracleEndpointById,
  setIsActiveOracleEndpoint,
  destroyOracleEndpointById
}
