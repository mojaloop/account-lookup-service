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

const Enum = require('./enum')
const request = require('./request')
const participantEndpointCache = require('../domain/participants/cache/participantEndpoint')

const getKeyCaseInsensitive = (o, key) => Object.keys(o).find(k => k.toLowerCase() === key.toLowerCase())

function defaultHeaders(destination, resource, source, version = '1.0') {
  // TODO: See API section 3.2.1; what should we do about X-Forwarded-For? Also, should we
  // add/append to this field in all 'queueResponse' calls?
  return {
    'Accept': `application/vnd.interoperability.${resource}+json;version=${version}`,
    'FSPIOP-Destination': destination,
    'Content-Type': `application/vnd.interoperability.${resource}+json;version=${version}`,
    'Date': (new Date()).toUTCString(),
    'FSPIOP-Source': source
  }
}

function setHeaders(headers, newHeaders) {
  return Object.entries(newHeaders).reduce((pv, [header, value]) => {
    const existingHeader = getKeyCaseInsensitive(headers, header)
    if (existingHeader === undefined) {
      return {...pv, [header]: value}
    }
    return {...pv, [existingHeader]: value}
  }, headers)
}

function filterHeaders(headers) {
  const keyInWhitelist = k => undefined !== Enum.defaultHeaderWhitelist.find(s => s.toLowerCase() === k.toLowerCase())
  return filterObject(headers, keyInWhitelist)
}

function filterObject(headers, f) {
  return Object.entries(headers).filter(([k, v]) => f(k, v)).reduce((pv, [k, v]) => ({...pv, [k]: v}), {})
}

function buildErrorObject(error, extensionList) {
  return {
    errorInformation: {
      errorCode: error.errorCode,
      errorDescription: error.errorDescription,
      extensionList
    }
  }
}

async function sendErrorToErrorEndpoint(req, participantName, endpointType, errorInformation) {
  const requesterErrorEndpoint = await participantEndpointCache.getEndpoint(participantName, endpointType)
  await request.sendRequest(requesterErrorEndpoint, req.headers, Enum.restMethods.PUT, errorInformation)
}

module.exports = {
  defaultHeaders,
  setHeaders,
  filterHeaders,
  buildErrorObject,
  sendErrorToErrorEndpoint
}