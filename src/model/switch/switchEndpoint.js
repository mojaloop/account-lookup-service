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

const getSwitchEndpointById = async (id) => {
  try {
    return await Db.switchEndpoint.findOne({switchEndpointId: id, isActive: true })
  } catch (err) {
    throw new Error(err.message)
  }
}

const getDefaultSwitchEndpoint = async () => {
  try {
    return await Db.switchEndpoint.findOne({isDefault: true, isActive: true })
  } catch (err) {
    throw new Error(err.message)
  }
}

const getAllSwitchEndpoint = async () => {
  try {
    return await Db.switchEndpoint.find({ isActive: true }, { order: 'name asc' })
  } catch (err) {
    throw new Error(err.message)
  }
}

const createSwitchEndpoint = async (switchEndpointModel, type) => {
  try {
    const knex = await Db.getKnex()
    return await knex.from(knex.raw('switchEndpoint (name, description, endpointTypeId, value, createdBy)'))
      .insert(function () {
        this.from('endpointType AS et')
          .where('et.type', type)
          .select(knex.raw('?', switchEndpointModel.name), knex.raw('?', switchEndpointModel.description), 'et.endpointTypeId',
            knex.raw('?', switchEndpointModel.value), knex.raw('?', switchEndpointModel.createdBy))
      })
  } catch (err) {
    throw new Error(err.message)
  }
}

const updateSwitchEndpoint = async (name, value ) => {
  try {
    return await Db.switchEndpoint.update({ name }, { value })
  } catch (err) {
    throw new Error(err.message)
  }
}

const setIsActiveSwitchEndpoint = async (name, isActive) => {
  try {
    return await Db.switchEndpoint.update({ name }, { isActive })
  } catch (err) {
    throw new Error(err.message)
  }
}

const destroySwitchEndpointByName = async (name) => {
  try {
    return await Db.switchEndpoint.update({ name }, { isActive: false })
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports ={
  getSwitchEndpointById,
  getAllSwitchEndpoint,
  getDefaultSwitchEndpoint,
  createSwitchEndpoint,
  updateSwitchEndpoint,
  setIsActiveSwitchEndpoint,
  destroySwitchEndpointByName
}