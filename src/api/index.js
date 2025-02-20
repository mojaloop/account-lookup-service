/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the 2020-2025 Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation

 * ModusBox
 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/

'use strict'

const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend

const participants = require('./participants')
const participantsId = require('./participants/{ID}')
const participantsErrorById = require('./participants/{ID}/error')
const participantsTypeId = require('./participants/{Type}/{ID}')
const participantsErrorTypeId = require('./participants/{Type}/{ID}/error')
const participantsTypeIdSubId = require('./participants/{Type}/{ID}/{SubId}')
const participantsErrorTypeIdSubId = require('./participants/{Type}/{ID}/{SubId}/error')

const partiesTypeId = require('./parties/{Type}/{ID}')
const partiesTypeIdSubId = require('./parties/{Type}/{ID}/{SubId}')
const partiesErrorTypeId = require('./parties/{Type}/{ID}/error')
const partiesErrorTypeIdSubId = require('./parties/{Type}/{ID}/{SubId}/error')

const oracles = require('./oracles')
const oraclesId = require('./oracles/{ID}')

const endpointCache = require('./endpointcache')
const health = require('./health')

module.exports.ApiHandlers = {
  HealthGet: health.get,
  ParticipantsErrorByIDPut: participantsErrorById.put,
  ParticipantsByIDPut: participantsId.put,
  ParticipantsErrorByTypeAndIDPut: participantsErrorTypeId.put,
  ParticipantsErrorBySubIdTypeAndIDPut: participantsErrorTypeIdSubId.put,
  ParticipantsSubIdByTypeAndIDGet: participantsTypeIdSubId.get,
  ParticipantsSubIdByTypeAndIDPut: participantsTypeIdSubId.put,
  ParticipantsSubIdByTypeAndIDPost: participantsTypeIdSubId.post,
  ParticipantsSubIdByTypeAndIDDelete: participantsTypeIdSubId.delete,
  ParticipantsByTypeAndIDGet: participantsTypeId.get,
  ParticipantsByTypeAndIDPut: participantsTypeId.put,
  ParticipantsByIDAndTypePost: participantsTypeId.post,
  ParticipantsByTypeAndIDDelete: participantsTypeId.delete,
  ParticipantsPost: participants.post,
  PartiesByTypeAndIDGet: partiesTypeId.get,
  PartiesByTypeAndIDPut: partiesTypeId.put,
  PartiesErrorByTypeAndIDPut: partiesErrorTypeId.put,
  PartiesBySubIdTypeAndIDGet: partiesTypeIdSubId.get,
  PartiesSubIdByTypeAndIDPut: partiesTypeIdSubId.put,
  PartiesErrorBySubIdTypeAndIDPut: partiesErrorTypeIdSubId.put,
  EndpointCacheDelete: endpointCache.delete,
  validationFail: OpenapiBackend.validationFail,
  notFound: OpenapiBackend.notFound,
  methodNotAllowed: OpenapiBackend.methodNotAllowed
}

module.exports.AdminHandlers = {
  HealthGet: health.get,
  OraclesGet: oracles.get,
  OraclesPost: oracles.post,
  OraclesByIdPut: oraclesId.put,
  OraclesByIdDelete: oraclesId.delete,
  validationFail: OpenapiBackend.validationFail,
  notFound: OpenapiBackend.notFound,
  methodNotAllowed: OpenapiBackend.methodNotAllowed
}
