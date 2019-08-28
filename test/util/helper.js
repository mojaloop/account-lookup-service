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
const Enums = require('@mojaloop/central-services-shared').Enum
const Config = require('../../src/lib/config')
const payerfsp = 'payerfsp'
const payeefsp = 'payeefsp'
const validatePayerFspUri = Mustache.render(Config.SWITCH_ENDPOINT + Enums.EndPoints.FspEndpointTemplates.PARTICIPANTS_GET, { fsp: payerfsp })
const validatePayeeFspUri = Mustache.render(Config.SWITCH_ENDPOINT + Enums.EndPoints.FspEndpointTemplates.PARTICIPANTS_GET, { fsp: payeefsp })
const defaultSwitchHeaders = resource => defaultHeaders(Enums.Http.HeaderResources.SWITCH, resource, Enums.Http.HeaderResources.SWITCH)
const defaultStandardHeaders = resource => defaultHeaders(payerfsp, resource, payeefsp)
const getPayerfspEndpointsUri = Mustache.render(Config.SWITCH_ENDPOINT + Enums.EndPoints.FspEndpointTemplates.PARTICIPANT_ENDPOINTS_GET, { fsp: payerfsp })
const getPayeefspEndpointsUri = Mustache.render(Config.SWITCH_ENDPOINT + Enums.EndPoints.FspEndpointTemplates.PARTICIPANT_ENDPOINTS_GET, { fsp: payeefsp })
const { createServer, service } = require('../../src/server')
const getPort = require('get-port')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const DefaultCentral = { ErrorHandler }

const nullLogger = ['error', 'debug', 'warn', 'silly', 'log', 'trace', 'info']
  .reduce((pv, method) => Object.assign(pv, { [method]: () => {} }), {})

/* @function startTestAdminServer
 * @function startTestAPIServer
 *
 * @description Convenience utilities for instantiating a server and placing it in the test context
 *
 * @param {function} buildAppMocks - a function that builds a set of mocks that are injected into
 *     handlers. These should mock the dependencies that are assigned to server.app in server.js.
 *
 * @returns {function} A function that accepts an ava test context, upon which it will store the
 *     instantiated server.
 */
const startTestAdminServer = (buildAppMocks = () => ({})) => startTestServer(service.ADMIN, buildAppMocks)
const startTestAPIServer = (buildAppMocks = () => ({})) => startTestServer(service.API, buildAppMocks)

const startTestServer = (service, buildAppMocks) => async t => {
  const appMockDefaults = { logger: nullLogger, Central: DefaultCentral }
  const appMocks = { ...appMockDefaults, ...buildAppMocks() }
  t.context.server = await createServer(await getPort(), service, appMocks)
  // The following code is looking for the Blipp plugin. It looks for the text of the listener
  // function that Blipp registers against the start event. If the text of that function matches
  // the regex here, it replaces the listener function to do nothing so it's not a nuisance during
  // the tests.
  // This was deemed to be easier than configuring the server create code to allow plugin
  // configuration- especially when the only intention is for testing.
  // Are your tests failing because of this code? It was deliberately written to fail
  // obviously if the conditions leading to its existence were no longer true.
  // - if you're not using Blipp any more, delete the following statement
  // - if the content of the Blipp .register function has changed, you may need to change the regex
  //   here, or delete or comment this line and put up with getting Blipped in your test output
  const listenerRegex = /const out = .*\n.*console\.log\(out\)/
  t.context.server.events._eventListeners.start.handlers.find(h => listenerRegex.test(h.listener))
    .listener = () => {}
  await t.context.server.start()
}

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

function defaultHeaders (destination, resource, source, version = '1.0') {
  // TODO: See API section 3.2.1; what should we do about X-Forwarded-For? Also, should we
  // add/append to this field in all 'queueResponse' calls?
  return {
    accept: `application/vnd.interoperability.${resource}+json;version=${version}`,
    'fspiop-destination': destination || '',
    'content-type': `application/vnd.interoperability.${resource}+json;version=${version}`,
    date: '2019-05-24 08:52:19',
    'fspiop-source': source,
    'fspiop-signature': '{"signature":"iU4GBXSfY8twZMj1zXX1CTe3LDO8Zvgui53icrriBxCUF_wltQmnjgWLWI4ZUEueVeOeTbDPBZazpBWYvBYpl5WJSUoXi14nVlangcsmu2vYkQUPmHtjOW-yb2ng6_aPfwd7oHLWrWzcsjTF-S4dW7GZRPHEbY_qCOhEwmmMOnE1FWF1OLvP0dM0r4y7FlnrZNhmuVIFhk_pMbEC44rtQmMFv4pm4EVGqmIm3eyXz0GkX8q_O1kGBoyIeV_P6RRcZ0nL6YUVMhPFSLJo6CIhL2zPm54Qdl2nVzDFWn_shVyV0Cl5vpcMJxJ--O_Zcbmpv6lxqDdygTC782Ob3CNMvg\\",\\"protectedHeader\\":\\"eyJhbGciOiJSUzI1NiIsIkZTUElPUC1VUkkiOiIvdHJhbnNmZXJzIiwiRlNQSU9QLUhUVFAtTWV0aG9kIjoiUE9TVCIsIkZTUElPUC1Tb3VyY2UiOiJPTUwiLCJGU1BJT1AtRGVzdGluYXRpb24iOiJNVE5Nb2JpbGVNb25leSIsIkRhdGUiOiIifQ"}'
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
    accept: 'application/vnd.interoperability.participants+json;version=1',
    'fspiop-destination': payeefsp,
    'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
    date: '2019-05-24 08:52:19',
    'fspiop-source': payerfsp
  },
  method: 'get'
}

const getByTypeIdRequestError = {
  query: {},
  params: {
    ID: '',
    Type: ''
  },
  headers: {
    accept: 'application/vnd.interoperability.participants+json;version=1',
    'fspiop-destination': payeefsp,
    'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
    date: '2019-05-24 08:52:19',
    'fspiop-source': payerfsp
  },
  method: 'get'
}

const putByTypeIdRequest = {
  query: {},
  params: {
    ID: '123456',
    Type: 'MSISDN'
  },
  headers: {
    accept: 'application/vnd.interoperability.participants+json;version=1',
    'fspiop-destination': payeefsp,
    'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
    date: '2019-05-24 08:52:19',
    'fspiop-source': payerfsp
  },
  method: 'put'
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
    accept: 'application/vnd.interoperability.participants+json;version=1',
    'fspiop-destination': payeefsp,
    'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
    date: '2019-05-24 08:52:19',
    'fspiop-source': payerfsp
  },
  method: 'get'
}

const postByTypeIdCurrencyRequest = {
  query: {
    currency: 'USD'
  },
  params: {
    ID: '123456',
    Type: 'MSISDN'
  },
  headers: {
    accept: 'application/vnd.interoperability.participants+json;version=1',
    'fspiop-destination': payeefsp,
    'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
    date: '2019-05-24 08:52:19',
    'fspiop-source': payerfsp
  },
  method: 'post'
}

const oracleGetCurrencyUri = Mustache.render(getOracleEndpointDatabaseResponse[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID_CURRENCY, {
  partyIdType: getByTypeIdCurrencyRequest.params.Type,
  partyIdentifier: getByTypeIdCurrencyRequest.params.ID,
  currency: getByTypeIdCurrencyRequest.query.currency
})

const oracleGetUri = Mustache.render(getOracleEndpointDatabaseResponse[0].value + Enums.EndPoints.FspEndpointTemplates.ORACLE_PARTICIPANTS_TYPE_ID, {
  partyIdType: getByTypeIdRequest.params.Type,
  partyIdentifier: getByTypeIdRequest.params.ID
})

const oracleGetPartiesUri = Mustache.render(getOracleEndpointDatabaseResponse[0].value + Enums.EndPoints.FspEndpointTemplates.PARTIES_GET, {
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
      type: Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT,
      value: 'localhost:33350'
    },
    {
      type: Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
      value: 'localhost:33351'
    },
    {
      type: Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT,
      value: 'localhost:33352'
    },
    {
      type: Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT_ERROR,
      value: 'localhost:33353'
    },
    {
      type: Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET,
      value: 'localhost:33354'
    },
    {
      type: Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT,
      value: 'localhost:33355'
    },
    {
      type: Enums.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
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

function defaultAdminHeaders () {
  return {
    Accept: 'application/vnd.interoperability.oracles+json;version=1',
    'Content-Type': 'application/vnd.interoperability.oracles+json;version=1.0',
    Date: (new Date()).toUTCString()
  }
}

module.exports = {
  defaultAdminHeaders,
  validatePayerFspUri,
  validatePayeeFspUri,
  defaultSwitchHeaders,
  defaultStandardHeaders,
  getPayerfspEndpointsUri,
  getPayeefspEndpointsUri,
  getOracleEndpointDatabaseResponse,
  oracleGetCurrencyUri,
  oracleGetUri,
  oracleGetPartiesUri,
  getByTypeIdRequest,
  putByTypeIdRequest,
  getByTypeIdRequestError,
  getByTypeIdCurrencyRequest,
  getOracleResponse,
  getEndPointsResponse,
  fspIdPayload,
  participantPutEndpointOptions,
  postByTypeIdCurrencyRequest,
  startTestAPIServer,
  startTestAdminServer,
  startTestServer
}
