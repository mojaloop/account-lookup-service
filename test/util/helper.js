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
 * - Name Surname <name.surname@gatesfoundation.com>

 *  - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 *  - Henk Kodde <henk.kodde@modusbox.com>

 --------------
 ******/
'use strict'

const Mustache = require('mustache')
const Enums = require('../../src/lib/enum')
const Config = require('../../src/lib/config')
const payerfsp = 'payerfsp'
const payeefsp = 'payeefsp'
const validatePayerFspUri = Mustache.render(Config.SWITCH_ENDPOINT + Enums.endpoints.participantsGet, {fsp: payerfsp})
const validatePayeeFspUri = Mustache.render(Config.SWITCH_ENDPOINT + Enums.endpoints.participantsGet, {fsp: payeefsp})
const defaultSwitchHeaders = defaultHeaders(Enums.apiServices.SWITCH, Enums.resources.participants, Enums.apiServices.SWITCH)
const getPayerfspEndpointsUri = Mustache.render(Config.SWITCH_ENDPOINT + Enums.endpoints.participantEndpoints, {fsp: payerfsp})
const getPayeefspEndpointsUri = Mustache.render(Config.SWITCH_ENDPOINT + Enums.endpoints.participantEndpoints, {fsp: payeefsp})


/**
 * @function defaultHeaders
 *
 * @description This returns a set of default headers used for requests
 *
 * see https://nodejs.org/dist/latest-v10.x/docs/api/http.html#http_message_headers
 *
 * @param {string} destination - to who the request is being sent
 * @param {string} resource - the flow that is being requested i.e. participants
 * @param {string} source - from who the request is made
 * @param {string} version - the version for the accept and content-type headers
 *
 * @returns {object} Returns the default headers
 */
function defaultHeaders(destination, resource, source, version = '1.0') {
  // TODO: See API section 3.2.1; what should we do about X-Forwarded-For? Also, should we
  // add/append to this field in all 'queueResponse' calls?
  return {
    'accept': `application/vnd.interoperability.${resource}+json;version=${version}`,
    'fspiop-destination': destination ? destination : '',
    'content-type': `application/vnd.interoperability.${resource}+json;version=${version}`,
    'date': '2019-05-24 08:52:19',
    'fspiop-source': source
  }
}

const getOracleEndpointDatabaseResponse = [{
  oracleEndpointId: 1,
  endpointType: 'URL',
  value: 'http://localhost:8444',
  idType: 'MSISDN',
  currency: 'USD',
  isDefault: true
}]

const getByTypeIdRequest = {
  query: {},
  params: {
    ID: '123456',
    Type: 'MSISDN'
  },
  headers: {
    'accept': `application/vnd.interoperability.participants+json;version=1`,
    'fspiop-destination': payeefsp,
    'content-type': `application/vnd.interoperability.participants+json;version=1.0`,
    'date': '2019-05-24 08:52:19',
    'fspiop-source': payerfsp
  },
  method: 'get'
}

const getByTypeIdCurrencyRequest = {
  query: {
    currency: 'USD'
  },
  params: {
    ID: '123456',
    Type: 'MSISDN'
  },
  headers: {
    'accept': `application/vnd.interoperability.participants+json;version=1`,
    'fspiop-destination': payeefsp,
    'content-type': `application/vnd.interoperability.participants+json;version=1.0`,
    'date': '2019-05-24 08:52:19',
    'fspiop-source': payerfsp
  },
  method: 'get'
}

const oracleGetCurrencyUri = Mustache.render(getOracleEndpointDatabaseResponse[0].value + Enums.endpoints.oracleParticipantsTypeIdCurrency, {
  partyIdType: getByTypeIdCurrencyRequest.params.Type,
  partyIdentifier: getByTypeIdCurrencyRequest.params.ID,
  currency: getByTypeIdCurrencyRequest.query.currency
})

const oracleGetUri = Mustache.render(getOracleEndpointDatabaseResponse[0].value + Enums.endpoints.oracleParticipantsTypeId, {
  partyIdType: getByTypeIdRequest.params.Type,
  partyIdentifier: getByTypeIdRequest.params.ID
})

const getOracleResponse = {
  data: {
    partyList: [{
      fspId: payeefsp
    }]
  }
}

const getEndPointsResponse = {
  data: [
    {
      type: Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT,
      value: 'localhost:33350'
    },
    {
      type: Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
      value: 'localhost:33351'
    },
    {
      type: Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT,
      value: 'localhost:33352'
    },
    {
      type: Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT_ERROR,
      value: 'localhost:33353'
    },
    {
      type: Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET,
      value: 'localhost:33354'
    },
    {
      type: Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT,
      value: 'localhost:33355'
    },
    {
      type: Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
      value: 'localhost:33356'
    }
  ]
}

const fspIdPayload = {
  fspId: payeefsp
}

const participantPutEndpointOptions = {
  partyIdType: getByTypeIdCurrencyRequest.params.Type,
  partyIdentifier: getByTypeIdCurrencyRequest.params.ID
}

function defaultAdminHeaders() {
  return {
    'Accept': 'application/vnd.interoperability.oracles+json;version=1',
    'Content-Type': 'application/vnd.interoperability.oracles+json;version=1.0',
    'Date': (new Date()).toUTCString()
  }
}

module.exports = {
  defaultAdminHeaders,
  validatePayerFspUri,
  validatePayeeFspUri,
  defaultSwitchHeaders,
  getPayerfspEndpointsUri,
  getPayeefspEndpointsUri,
  getOracleEndpointDatabaseResponse,
  oracleGetCurrencyUri,
  oracleGetUri,
  getByTypeIdRequest,
  getByTypeIdCurrencyRequest,
  getOracleResponse,
  getEndPointsResponse,
  fspIdPayload,
  participantPutEndpointOptions
}