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
    'date': (new Date()).toUTCString(),
    'fspiop-source': source
  }
}

/**
 * @function buildErrorObject
 *
 * @description This returns an error object built from requested values
 *
 * see https://nodejs.org/dist/latest-v10.x/docs/api/http.html#http_message_headers
 *
 * @param {object} error - error object with error code and description
 * @param {object} extensionList - extra
 *
 * @returns {object} Returns errorInformation object
 */
function buildErrorObject(error, extensionList) {
  return {
    errorInformation: {
      errorCode: error.errorCode.toString(),
      errorDescription: error.errorDescription,
      extensionList
    }
  }
}

/**
 * @function transformHeaders
 *
 * @description This will transform the headers before sending to kafka
 * NOTE: Assumes incoming headers keys are lowercased. This is a safe
 * assumption only if the headers parameter comes from node default http framework.
 *
 * see https://nodejs.org/dist/latest-v10.x/docs/api/http.html#http_message_headers
 *
 * @param {object} headers - the http header from the request
 * @param {object} config - the required headers you with to alter
 * @param {boolean} isOracle - if the request is going to an oracle
 *
 * @returns {object} Returns the normalized headers
 */
const transformHeaders = (headers, config, isOracle) => {
  // Normalized keys
  let normalizedKeys = Object.keys(headers).reduce(
    function (keys, k) {
      keys[k.toLowerCase()] = k
      return keys
    }, {})

  // Normalized headers
  let normalizedHeaders = {}

  // check to see if FSPIOP-Destination header has been left out of the initial request. If so then add it.
  if (!normalizedKeys.hasOwnProperty(Enum.headers.FSPIOP.DESTINATION)) {
    headers[Enum.headers.FSPIOP.DESTINATION] = ''
  }

  for (let headerKey in headers) {
    let headerValue = headers[headerKey]
    switch (headerKey.toLowerCase()) {
    case (Enum.headers.GENERAL.DATE):
      let tempDate = {}
      if (typeof headerValue === 'object' && headerValue instanceof Date) {
        tempDate = headerValue.toUTCString()
      } else {
        try {
          tempDate = (new Date(headerValue)).toUTCString()
          if (tempDate === 'Invalid Date') {
            throw new Error('Invalid Date')
          }
        } catch (err) {
          tempDate = headerValue
        }
      }
      normalizedHeaders[headerKey] = tempDate
      break
    case (Enum.headers.GENERAL.CONTENT_LENGTH):
      // Do nothing here, do not map. This will be inserted correctly by the Hapi framework.
      break
    case (Enum.headers.FSPIOP.URI):
      // Do nothing here, do not map. This will be removed from the callback request.
      break
    case (Enum.headers.FSPIOP.HTTP_METHOD):
      if (config.httpMethod.toLowerCase() === headerValue.toLowerCase()) {
        // HTTP Methods match, and thus no change is required
        normalizedHeaders[headerKey] = headerValue
      } else {
        // HTTP Methods DO NOT match, and thus a change is required for target HTTP Method
        normalizedHeaders[headerKey] = config.httpMethod
      }
      break
    case (Enum.headers.FSPIOP.SIGNATURE):
      // Check to see if we find a regex match the source header containing the switch name.
      // If so we include the signature otherwise we remove it.

      if (headers[normalizedKeys[Enum.headers.FSPIOP.SOURCE]].match(Enum.headers.FSPIOP.SWITCH.regex) === null) {
        normalizedHeaders[headerKey] = headerValue
      }
      break
    case (Enum.headers.FSPIOP.SOURCE):
      normalizedHeaders[headerKey] = config.sourceFsp
      break
    case (Enum.headers.FSPIOP.DESTINATION):
      if(config.destinationFsp) {
        normalizedHeaders[headerKey] = config.destinationFsp
      }
      break
    case (Enum.headers.GENERAL.HOST):
      break
    case (Enum.headers.GENERAL.ACCEPT):
      if (isOracle) {
        normalizedHeaders[Enum.headers.GENERAL.ACCEPT] = Enum.headers.DEFAULT.APPLICATION_JSON
      } else{
        normalizedHeaders[headerKey] = headerValue
      }
      break
    case (Enum.headers.GENERAL.CONTENT_TYPE):
      if (isOracle) {
        normalizedHeaders[Enum.headers.GENERAL.CONTENT_TYPE] = Enum.headers.DEFAULT.APPLICATION_JSON
      }else {
        normalizedHeaders[headerKey] = headerValue
      }
      break
    default:
      normalizedHeaders[headerKey] = headerValue
    }
  }

  if (config && config.httpMethod !== Enum.restMethods.POST) {
    delete normalizedHeaders[Enum.headers.GENERAL.ACCEPT]
  }
  return normalizedHeaders
}


module.exports = {
  defaultHeaders,
  buildErrorObject,
  transformHeaders
}