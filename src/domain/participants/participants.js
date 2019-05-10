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
const Enums = require('../../lib/enum')
const util = require('../../lib/util')
const Errors = require('../../lib/error')
const oracle = require('../../models/oracle/facade')
const participant = require('../../models/participantEndpoint/facade')

/**
 * @function getParticipantsByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results back to requester
 *
 * @param {object} req The request object from the Hapi server
 */
const getParticipantsByTypeAndID = async (req) => {
  try {
    Logger.info('getParticipantsByTypeAndID::begin')
    const type = req.params.Type
    const requesterName = req.headers['fspiop-source']
    const requesterParticipantModel = await participant.validateParticipant(req.headers['fspiop-source'])
    if (requesterParticipantModel) {
      if (Object.values(Enums.type).includes(type)) {
        const response = await oracle.oracleRequest(req)
        if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
          let options = {
            partyIdType: type,
            partyIdentifier: req.params.ID
          }
          let payload = {
            fspId: response.data.partyList[0].fspId
          }
          await participant.sendRequest(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT, Enums.restMethods.PUT, payload, options)
        } else {
          await participant.sendErrorToParticipant(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
            util.buildErrorObject(Errors.ErrorObject.PARTY_NOT_FOUND_ERROR, [{key: type, value: req.params.ID}]))
        }
      } else {
        await participant.sendErrorToParticipant(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
          util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
      }
      Logger.info('getParticipantsByTypeAndID::end')
    } else {
      Logger.error('Requester FSP not found')
      // TODO: handle issue where requester fsp not found. Pass to error handling framework
    }
  } catch (e) {
    Logger.error(e)
    await participant.sendErrorToParticipant(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
      util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: req.params.Type, value: req.params.ID}]))
  }
}

/**
 * @function putParticipantsErrorByTypeAndID
 *
 * @description This is a callback function
 *
 */
const putParticipantsErrorByTypeAndID = async () => {
  try {
    // const destinationParticipant = req.headers['fspiop-destination']
    // if (validateParticipant(destinationParticipant)) {
    //   const destinationEndpoint = await participantEndpointCache.getEndpoint(destinationParticipant, Enums.endpointTypes.FSPIOP_CALLBACK_URL)
    //   await request.sendRequest(destinationEndpoint, req.headers, Enums.restMethods.PUT, req.body)
    //   Logger.info(JSON.stringify(req))
    // } else {
    //
    // }
  } catch (e) {
    Logger.error(e)
  }
}

/**
 * @function postParticipants
 *
 * @description This sends request to all applicable oracles to store
 *
 * @param {object} req The request object from the Hapi server
 */
const postParticipants = async (req) => {
  try {
    Logger.info('postParticipants::begin')
    const type = req.params.Type
    if (Object.values(Enums.type).includes(type)) {
      const requesterParticipantModel = await participant.validateParticipant(req.headers['fspiop-source'])
      if (requesterParticipantModel) {
        let response = await oracle.oracleRequest(req)
        if (response && response.data) {
          let payload = {
            partyList: [
              {
                partyIdType: type,
                partyIdentifier: req.params.ID,
                fspId: req.payload.fspId
              }
            ],
            currency: req.payload.currency
          }
          let options = {
            requestId: req.params.ID
          }
          await participant.sendRequest(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT, Enums.restMethods.PUT, payload, options)
        } else {
          // TODO: what happens when nothing is returned
          await participant.sendErrorToParticipant(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT,
            util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
        }
      } else {
        Logger.error('Requester FSP not found')
        // TODO: handle issue where requester fsp not found. Pass to error handling framework
      }
    } else {
      await participant.sendErrorToParticipant(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
        util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
    }
    Logger.info('postParticipants::end')
  } catch (e) {
    Logger.error(e)
    await participant.sendErrorToParticipant(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
      util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: req.params.Type, value: req.params.ID}]))
  }
}


/**
 * @function postParticipantsBatch
 *
 * @description This sends request to all applicable oracles to store
 *
 * @param {object} req The request object from the Hapi server
 */
const postParticipantsBatch = async (req) => {
  try {
    Logger.info('postParticipantsBatch::begin')
    const typeMap = new Map()
    const overallReturnList = []
    const requestId = req.payload.requestId
    const requesterParticipantModel = await participant.validateParticipant(req.headers['fspiop-source'])
    if (requesterParticipantModel) {
      for (let party of req.payload.partyList) {
        if (Object.values(Enums.type).includes(party.partyIdType)) {
          party.currency = req.payload.currency
          if (party.fspId === req.headers['fspiop-source']) {
            if (typeMap.get(party.partyIdType)) {
              const partyList = typeMap.get(party.partyIdType)
              partyList.push(party)
              typeMap.set(party.partyIdType, partyList)
            } else {
              typeMap.set(party.partyIdType, [party])
            }
          } else {
            overallReturnList.push(util.buildErrorObject(Errors.ErrorObject.PARTY_NOT_FOUND_ERROR, [{key: party.partyIdType, value: party.partyIdentifier}]))
          }
        } else {
          overallReturnList.push(util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: party.partyIdType, value: party.partyIdentifier}]))
        }
      }
      for (let [key, value] of typeMap) {
        let payload = {
          partyList: value
        }
        Logger.info(`postParticipantsBatch::oracleBatchRequest::type=${key}`)
        let response = await oracle.oracleBatchRequest(req, key, payload)
        if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
          overallReturnList.concat(response.data.partyList)
        } else {
          // TODO: what happens when nothing is returned
          for (let party of value) {
            overallReturnList.push(util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: party.partyIdType, value: party.partyIdentifier}]))
          }
        }
      }
      let payload = {
        partyList: overallReturnList,
        currency: req.payload.currency
      }
      await participant.sendRequest(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT, Enums.restMethods.PUT, payload, {requestId})
      Logger.info('postParticipantsBatch::end')
    } else {
      Logger.error('Requester FSP not found')
      // TODO: handle issue where requester fsp not found send to error handling framework
    }
  } catch (e) {
    Logger.error(e)
  }
}

module.exports = {
  getParticipantsByTypeAndID,
  putParticipantsErrorByTypeAndID,
  postParticipants,
  postParticipantsBatch
}