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

 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-shared').Logger
const oracleEndpoint = require('../../model/oracle')
const Enums = require('../../lib/enum')
const request = require('../../lib/request')
const participantEndpointCache = require('../../domain/participants/cache/participantEndpoint')
const util = require('../../lib/util')
/**
 * @function getPartiesByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results back to requester
 *
 * @param {object} req The request object from the Hapi server
 */
const getPartiesByTypeAndID = async (req) => {
  try {
    Logger.info('parties::getPartiesByTypeAndID::begin')
    const type = req.params.Type
    if (Object.values(Enums.type).includes(type)) {
      const oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
      const url = oracleEndpointModel.value + req.path
      const payload = req.payload || undefined
      const response = await request.sendRequest(url, req.headers, req.method, payload)
      // TODO if returned response is not correct then send a message back to source FSPs
      const targetParticipant = response.partyList[0].fspId
      const headers = util.setHeaders(util.filterHeaders(req.headers),
        { 'fspiop-destination': targetParticipant })
      const requestedEndpoint = await participantEndpointCache.getEndpoint(targetParticipant, Enums.endpointTypes.FSIOP_CALLBACK_URL)
      await request.sendRequest(requestedEndpoint, headers, Enums.restMethods.PUT, response.body)
      Logger.info('parties::getPartiesByTypeAndID::end')
    } else {
      // TODO handle negative case when type not located
    }
  } catch (e) {

    Logger.error(e)
  }
}

/**
 * @function putPartiesByTypeAndID
 *
 * @description This sends a callback to inform participant of successful lookup
 *
 * @param {object} req The request object from the Hapi server
 */
const putPartiesByTypeAndID = async (req) => {
  try {
    Logger.info('parties::putPartiesByTypeAndID::begin')
    const destinationParticipant = req.headers['fspiop-destination']
    const requestedEndpoint = await participantEndpointCache.getEndpoint(destinationParticipant, Enums.endpointTypes.FSIOP_CALLBACK_URL)
    await request.sendRequest(requestedEndpoint, req.headers, Enums.restMethods.PUT, req.body)
    Logger.info('parties::putPartiesByTypeAndID::end')
  } catch (e) {

    Loggder.error(e)
  }
}

/**
 * @function putPartiesErrorByTypeAndID
 *
 * @description This populates the cache of endpoints
 *
 * @param {object} req The request object from the Hapi server
 */
const putPartiesErrorByTypeAndID = async (req) => {
  try {
    const destinationParticipant = req.headers['fspiop-destination']
    const destinationEndpoint = await participantEndpointCache.getEndpoint(destinationParticipant, Enums.endpointTypes.FSIOP_CALLBACK_URL)
    await request.sendRequest(destinationEndpoint, req.headers, Enums.restMethods.PUT, req.body)
    Logger.info(JSON.stringify(req))
  } catch (e) {
    Logger.error(e)
  }
}

module.exports = {
  getPartiesByTypeAndID,
  putPartiesByTypeAndID,
  putPartiesErrorByTypeAndID
}