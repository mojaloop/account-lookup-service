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

const Db = require('@mojaloop/central-services-database').Db

const getOracleEndpointByType = async (type) => {
  try {
    return Db.oracleEndpoint.query(builder => {
      return builder.innerJoin('currency AS cu', 'oracleEndpoint.currencyId', 'cu.currencyId')
        .innerJoin('endpointType AS et', 'oracleEndpoint.endpointTypeId', 'et.endpointTypeId')
        .innerJoin('partyIdType AS pt', 'oracleEndpoint.partyIdTypeId', 'pt.partyIdTypeId')
        .innerJoin('switchEndpoint AS cs', 'oracleEndpoint.switchEndpointId', 'cs.switchEndpointId')
        .where({
          'pt.name': type,
          'pt.isActive': 1,
          'oracleEndpoint.isActive': 1,
          'oracleEndpoint.isDefault': 1,
          'cs.isActive': 1
        })
        .select('oracleEndpoint.value', 'oracleEndpoint.switchEndpointId', 'et.type as endpointType')
    })
  } catch (err) {
    throw new Error(err.message)
  }
}

const getOracleEndpointByTypeAndCurrency = async (type, currencyId) => {
  try {
    return Db.oracleEndpoint.query(builder => {
      return builder.innerJoin('currency AS cu', 'oracleEndpoint.currencyId', 'cu.currencyId')
        .innerJoin('endpointType AS et', 'oracleEndpoint.endpointTypeId', 'et.endpointTypeId')
        .innerJoin('partyIdType AS pt', 'oracleEndpoint.partyIdTypeId', 'pt.partyIdTypeId')
        .innerJoin('switchEndpoint AS cs', 'oracleEndpoint.switchEndpointId', 'cs.switchEndpointId')
        .where({
          'pt.name': type,
          'cu.currencyId': currencyId,
          'pt.isActive': 1,
          'oracleEndpoint.isActive': 1,
          'cs.isActive': 1
        })
        .select('oracleEndpoint.value', 'oracleEndpoint.switchEndpointId', 'et.type as endpointType')
    })
  } catch (err) {
    throw new Error(err.message)
  }
}

const getAllOracleEndpoint = async () => {
  try {
    return await Db.oracleEndpoint.find({isActive: true}, {order: 'name asc'})
  } catch (err) {
    throw new Error(err.message)
  }
}

const createOracleEndpoint = async (oracleEndpointModel, type) => {
  try {
    const knex = await Db.getKnex()
    return await knex.from(knex.raw('oracleEndpoint (oracleType, endpointTypeId, value, createdBy)'))
      .insert(function () {
        this.from('endpointType AS et')
          .where('et.type', type)
          .select(knex.raw('?', oracleEndpointModel.oracleType), 'et.endpointTypeId',
            knex.raw('?', oracleEndpointModel.value), knex.raw('?', oracleEndpointModel.createdBy))
      })
  } catch (err) {
    throw new Error(err.message)
  }
}

const updateOracleEndpoint = async (oracleType, value) => {
  try {
    return await Db.oracleEndpoint.update({oracleType}, {value})
  } catch (err) {
    throw new Error(err.message)
  }
}

const setIsActiveOracleEndpoint = async (oracleType, isActive) => {
  try {
    return await Db.oracleEndpoint.update({oracleType}, {isActive})
  } catch (err) {
    throw new Error(err.message)
  }
}

const destroyOracleEndpointByType = async (oracleType) => {
  try {
    return await Db.oracleEndpoint.update({oracleType}, {isActive: false})
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports = {
  getOracleEndpointByType,
  getOracleEndpointByTypeAndCurrency,
  getAllOracleEndpoint,
  createOracleEndpoint,
  updateOracleEndpoint,
  setIsActiveOracleEndpoint,
  destroyOracleEndpointByType
}