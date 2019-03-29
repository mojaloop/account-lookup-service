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
const participant = require('../../domain/participants')
const util = require('../../lib/util')
const Errors = require('../../lib/error')

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
      let oracleEndpointModel
      if (req.query && req.query.currency && req.query.currency.length !== 0) {
        oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(type, req.query.currency)
      } else {
        oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
      }
      if (oracleEndpointModel) {
        const requesterParticipantModel = await participant.validateParticipant(req.headers['fspiop-source'])
        if(requesterParticipantModel) {
          const url = oracleEndpointModel[0].value + req.raw.req.url
          const payload = req.payload || undefined
          const response = await request.sendRequest(url, req.headers, req.method, payload)
          if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
            const requesterEndpoint = await participant.getEndpoint(response.data.partyList[0].fspId, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET)
            if (requesterEndpoint) {
              const fspUrl = requesterEndpoint + req.raw.req.url
              await request.sendRequest(fspUrl, req.headers)
              Logger.info('parties::getPartiesByTypeAndID::end')
            } else {
              await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
                util.buildErrorObject(Errors.ErrorObject.DESTINATION_FSP_NOT_FOUND_ERROR, [{key: '', value: ''}]))
            }
          } else {
            await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
              util.buildErrorObject(Errors.ErrorObject.PARTY_NOT_FOUND_ERROR, [{key: '', value: ''}]))
          }
        } else {
          Logger.error('Requester FSP not found')
          // TODO: handle issue where requester fsp not found
        }
      } else {
        await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
          util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: '', value: ''}]))
      }
    } else {
      await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
        util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: '', value: ''}]))
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
    const requesterParticipant = await participant.validateParticipant(req.headers['fspiop-source'])
    const type = req.params.Type
    if (Object.values(Enums.type).includes(type)) {
      if (requesterParticipant) {
        const destinationParticipant = await participant.validateParticipant(req.headers['fspiop-destination'])
        if (destinationParticipant) {
          const requestedEndpoint = await participant.getEndpoint(destinationParticipant.body.name, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT)
          const url = requestedEndpoint + req.raw.req.url
          await request.sendRequest(url, req.headers, Enums.restMethods.PUT, req.payload)
          Logger.info('parties::putPartiesByTypeAndID::end')
        } else {
          const requesterErrorEndpoint = await participant.getEndpoint(requesterParticipant.body.name, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR)
          await request.sendRequest(requesterErrorEndpoint, req.headers, Enums.restMethods.PUT,
            util.buildErrorObject(Errors.ErrorObject.DESTINATION_FSP_NOT_FOUND_ERROR, [{key: '', value: ''}]))
        }
      } else {
        Logger.error('Requester FSP not found')
        // TODO: handle issue where requester fsp not found
      }
    } else {
      await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
        util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: '', value: ''}]))
    }
  } catch (e) {
    Logger.error(e)
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
    const destinationEndpoint = await participant.getEndpoint(destinationParticipant, Enums.endpointTypes.FSPIOP_CALLBACK_URL)
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