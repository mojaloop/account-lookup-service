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
 * Name Surname <name.surname@gatesfoundation.com>

 * Matt Kingston <matt.kingston@modusbox.com>

 --------------
 ******/

'use strict'

const anyVersion = require('./anyVersion')

const generateContentTypeRegex = resource =>
  new RegExp(`^application/vnd\\.interoperability\\.${resource}\\+json;version=(\\d+\\.\\d+)$`)

const generateAcceptRegex = resource =>
  new RegExp(`^${generateSingleAcceptRegexStr(resource)}(,${generateSingleAcceptRegexStr(resource)})*$`)

const generateSingleAcceptRegexStr = resource =>
  `application/vnd\\.interoperability\\.${resource}\\+json(;version=\\d+(\\.\\d+)?)?`

const parseContentTypeHeader = (path, header) => {
  if (typeof header !== 'string') {
    throw new Error('Header type invalid')
  }

  // First, extract the resource type from the path
  const resource = path.replace(/^\//, '').split('/')[0]

  // Create the validation regex
  const r = generateContentTypeRegex(resource)

  // Test the header
  const match = header.match(r)
  if (match === null) {
    return {valid: false}
  }

  return {
    valid: true,
    resource,
    version: match[1]
  }
}

const parseAcceptHeader = (path, header) => {
  if (typeof header !== 'string') {
    throw new Error('Header type invalid')
  }

  // First, extract the resource type from the path
  const resource = path.replace(/^\//, '').split('/')[0]

  // Create the validation regex
  const r = generateAcceptRegex(resource)

  // Test the header
  if (header.match(r) === null) {
    return {valid: false}
  }

  // The header contains a comma-delimited set of versions, extract these
  const versions = new Set(header
    .split(',')
    .map(verStr => verStr.match(new RegExp(generateSingleAcceptRegexStr(resource)))[1])
    .map(match => match === undefined ? anyVersion : match.split('=')[1])
  )

  return {
    valid: true,
    resource,
    versions
  }
}

const e164Validate = num => null != num.match(/^\+?[1-9]\d{1,14}$/)


module.exports = {
  parseAcceptHeader,
  parseContentTypeHeader,
  anyVersion,
  e164Validate,
  test: require('./tests/_support')
}
