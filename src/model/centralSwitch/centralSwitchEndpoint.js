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

const getCentralSwitchEndpointById = async (id) => {
  try {
    return await Db.centralSwitchEndpoint.findOne({centralSwitchEndpointId: id, isActive: true })
  } catch (err) {
    throw new Error(err.message)
  }
}

const getAllCentralSwitchEndpoint = async () => {
  try {
    return await Db.centralSwitchEndpoint.find({ isActive: true }, { order: 'name asc' })
  } catch (err) {
    throw new Error(err.message)
  }
}

const createCentralSwitchEndpoint = async (centralSwitchEndpointModel, type) => {
  try {
    const knex = await Db.getKnex()
    return await knex.from(knex.raw('centralSwitchEndpoint (name, description, endpointTypeId, value, createdBy)'))
      .insert(function () {
        this.from('endpointType AS et')
          .where('et.type', type)
          .select(knex.raw('?', centralSwitchEndpointModel.name), knex.raw('?', centralSwitchEndpointModel.description), 'et.endpointTypeId',
            knex.raw('?', centralSwitchEndpointModel.value), knex.raw('?', centralSwitchEndpointModel.createdBy))
      })
  } catch (err) {
    throw new Error(err.message)
  }
}

const updateCentralSwitchEndpoint = async (name, value ) => {
  try {
    return await Db.centralSwitchEndpoint.update({ name }, { value })
  } catch (err) {
    throw new Error(err.message)
  }
}

const setIsActiveCentralSwitchEndpoint = async (name, isActive) => {
  try {
    return await Db.centralSwitchEndpoint.update({ name }, { isActive })
  } catch (err) {
    throw new Error(err.message)
  }
}

const destroyCentralSwitchEndpointByName = async (name) => {
  try {
    return await Db.centralSwitchEndpoint.update({ name }, { isActive: false })
  } catch (err) {
    throw new Error(err.message)
  }
}

module.exports ={
  getCentralSwitchEndpointById,
  getAllCentralSwitchEndpoint,
  createCentralSwitchEndpoint,
  updateCentralSwitchEndpoint,
  setIsActiveCentralSwitchEndpoint,
  destroyCentralSwitchEndpointByName
}