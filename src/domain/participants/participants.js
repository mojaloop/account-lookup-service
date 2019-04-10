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
const oracleEndpoint = require('../../models/oracle')
const Enums = require('../../lib/enum')
const request = require('../../lib/request')
const participantEndpointCache = require('./cache/participantEndpoint')
const util = require('../../lib/util')
const Mustache = require('mustache')
const Config = require('../../lib/config')
const Errors = require('../../lib/error')
/**
 * @function getParticipantsByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results back to requester
 *
 * @param {string} requesterName The FSPIOP-Source fsp id
 * @param {object} req The request object from the Hapi server
 */
const getParticipantsByTypeAndID = async (requesterName, req) => {
  try {
    const type = req.params.Type
    if (Object.values(Enums.type).includes(type)) {
      let oracleEndpointModel
      if (req.query && req.query.currency && req.query.currency.length !== 0) {
        oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(type, req.query.currency)
      } else {
        oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
      }
      if (oracleEndpointModel) {
        const requesterParticipantModel = await validateParticipant(req.headers['fspiop-source'])
        if (requesterParticipantModel) {
          const url = oracleEndpointModel[0].value + req.raw.req.url
          Logger.debug(`Oracle endpoints: ${url}`)
          const payload = req.payload || undefined
          const response = await request.sendRequest(url, req.headers, req.method, payload)
          if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
            const requesterEndpoint = await participantEndpointCache.getEndpoint(requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT, {partyIdType: type, partyIdentifier: req.params.ID})
            Logger.debug(`participant endpoint url: ${requesterEndpoint} for endpoint type ${Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT}`)
            if (requesterEndpoint) {
              await request.sendRequest(requesterEndpoint, req.headers, Enums.restMethods.PUT, response.data)
            } else {
              await util.sendErrorToErrorEndpoint(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
                util.buildErrorObject(Errors.ErrorObject.DESTINATION_FSP_NOT_FOUND_ERROR, [{key: type, value: req.params.ID}]))
            }
          } else {
            await util.sendErrorToErrorEndpoint(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
              util.buildErrorObject(Errors.ErrorObject.PARTY_NOT_FOUND_ERROR, [{key: type, value: req.params.ID}]))
          }
        } else {
          Logger.error('Requester FSP not found')
          // TODO: handle issue where requester fsp not found. Pass to error handling framework
        }
      } else {
        await util.sendErrorToErrorEndpoint(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
          util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
      }
    } else {
      await util.sendErrorToErrorEndpoint(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
        util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
    }
  } catch (e) {
    Logger.error(e)
  }
}

/**
 * @function putParticipantsErrorByTypeAndID
 *
 * @description This is a callback function
 *
 * @param {object} req The request object from the Hapi server
 */
const putParticipantsErrorByTypeAndID = async (req) => {
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
    const type = req.params.Type
    if (Object.values(Enums.type).includes(type)) {
      const requesterParticipantModel = await validateParticipant(req.headers['fspiop-source'])
      if (req.payload.fspId === req.headers['fspiop-source']) {
        if (requesterParticipantModel) {
          let oracleEndpointModel
          if (req.payload.currency && req.payload.currency.length !== 0) {
            oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(type, req.payload.currency)
          } else {
            oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
          }
          if (oracleEndpointModel.length > 0) {
            const url = oracleEndpointModel[0].value + req.raw.req.url
            Logger.debug(`Oracle endpoints: ${url}`)
            let response
            response = await request.sendRequest(url, req.headers, req.method, req.payload)
            if (response && response.data) {
              const requesterEndpoint = await participantEndpointCache.getEndpoint(req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT, {partyIdType: type, partyIdentifier: req.params.ID})
              Logger.debug(`participant endpoint url: ${requesterEndpoint} for endpoint type ${Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT}`)
              await request.sendRequest(requesterEndpoint, req.headers, Enums.restMethods.PUT, response.data)
            } else {
              // TODO: what happens when nothing is returned
              await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
                util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
            }
          }
        } else {
          // TODO: what happens requester not found
          await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
            util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
        }
      } else {
        // TODO: what happens requester and fspId not the same
        await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
          util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
      }
    } else {
      await util.sendErrorToErrorEndpoint(req, req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
        util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: type, value: req.params.ID}]))
    }
  } catch (e) {
    Logger.error(e)
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
    const typeMap = new Map()
    const overallReturnList = []
    const requesterParticipantModel = await validateParticipant(req.headers['fspiop-source'])
    if (requesterParticipantModel) {
      for (let party of req.payload.partyList) {
        if (Object.values(Enums.type).includes(party.partyIdType)) {
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
        let oracleEndpointModel
        if (req.payload.currency && req.payload.currency.length !== 0) {
          oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(key, req.payload.currency)
        } else {
          oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(key)
        }
        if (oracleEndpointModel.length > 0) {
          const url = oracleEndpointModel[0].value + req.raw.req.url
          Logger.debug(`Oracle endpoints: ${url}`)
          req.payload.partyList = value
          let response
          response = await request.sendRequest(url, req.headers, req.method, req.payload)
          if (response && response.data && Array.isArray(response.data.partyList) && response.data.partyList.length > 0) {
            overallReturnList.concat(response.data.partyList)
          } else {
            // TODO: what happens when nothing is returned
            for (let party of value) {
              overallReturnList.push(util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: party.partyIdType, value: party.partyIdentifier}]))
            }
          }
        } else {
          // TODO: what happens oracle type not found
          for (let party of value) {
            overallReturnList.push(util.buildErrorObject(Errors.ErrorObject.ADD_PARTY_ERROR, [{key: party.partyIdType, value: party.partyIdentifier}]))
          }
        }
      }
      req.payload.partyList = overallReturnList
      const requesterEndpoint = await participantEndpointCache.getEndpoint(req.headers['fspiop-source'], Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT, {requestId: req.payload.requestId})
      Logger.debug(`participant endpoint url: ${requesterEndpoint} for endpoint type ${Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT}`)
      await request.sendRequest(requesterEndpoint, req.headers, Enums.restMethods.PUT, req.payload)
    } else {
      Logger.error('Requester FSP not found')
      // TODO: handle issue where requester fsp not found send to error handling framework
    }
  } catch (e) {
    Logger.error(e)
  }
}


/**
 * @function validateParticipant
 *
 * @description sends a request to central-ledger to retrieve participant details and validate that they exist within the switch
 *
 * @param {string} fsp The FSPIOP-Source fsp id
 * @returns the participants info in a successful case and
 */
const validateParticipant = async (fsp) => {
  try {
    const getParticipantUrl = Mustache.render(Config.SWITCH_ENDPOINT + Enums.switchEndpoints.participantsGet, {fsp})
    Logger.debug(`validateParticipant url: ${getParticipantUrl}`)
    return await request.sendRequest(getParticipantUrl, util.defaultHeaders(Enums.apiServices.CL, Enums.resources.participants, Enums.apiServices.ALS))
  } catch (e) {
    Logger.error(e)
    return null
  }
}

module.exports = {
  getParticipantsByTypeAndID,
  putParticipantsErrorByTypeAndID,
  validateParticipant,
  postParticipants,
  postParticipantsBatch
}