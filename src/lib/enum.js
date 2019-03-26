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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/
'use strict'

// TODO We should store this in the database and like to oracleEndpoint table for oracleType
const type = {
  MSISDN: 'MSISDN',
  EMAIL: 'EMAIL',
  PERSONAL_ID: 'PERSONAL_ID',
  BUSINESS: 'BUSINESS',
  DEVICE: 'DEVICE',
  ACCOUNT_ID: 'ACCOUNT_ID',
  IBAN: 'IBAN',
  ALIAS: 'ALIAS'
}

const resources = {
  participants: 'participants',
  oracle: 'oracle'
}

const apiServices = {
  ALS: 'account-lookup-service',
  CL: 'central-ledger-service'
}

// TODO need get all these endpoints from somewhere
const endpointTypes = {
  FSPIOP_CALLBACK_URL: 'FSPIOP_CALLBACK_URL',
  FSPIOP_CALLBACK_URL_PARTIES_GET: 'FSPIOP_CALLBACK_URL_PARTIES_GET',
  FSPIOP_CALLBACK_URL_PARTICIPANT_PUT: 'FSPIOP_CALLBACK_URL_PARTICIPANT_PUT',
  FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR: 'FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR',
  FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT: 'FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT',
  FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT_ERROR: 'FSPIOP_CALLBACK_URL_PARTICIPANT_BATCH_PUT_ERROR',
  FSPIOP_CALLBACK_URL_PARTIES_PUT: 'FSPIOP_CALLBACK_URL_PARTIES_PUT',
  FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR: 'FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR'
}

const restMethods = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE'
}

// TODO this needs to be looked at
const defaultHeaderWhitelist = [
  'accept',
  'fspiop-destination',
  'fspiop-http-method',
  'fspiop-signature',
  'fspiop-source',
  'fspiop-uri',
  'date',
  'content-type'
]

const switchEndpoints = {
  participantEndpoints: '/participants/{{fsp}}/endpoints',
  participantsGet: '/participants/{{fsp}}'
}

module.exports = {
  type,
  resources,
  apiServices,
  endpointTypes,
  restMethods,
  defaultHeaderWhitelist,
  switchEndpoints
}