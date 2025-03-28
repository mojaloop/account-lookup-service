/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const { randomUUID } = require('node:crypto')
const { Enum } = require('@mojaloop/central-services-shared')
const isoFixtures = require('./iso')

const { Headers } = Enum.Http

const headersDto = ({
  source = 'fromDfsp',
  destination = 'toDfsp',
  proxy = '',
  date = new Date().toUTCString(),
  accept,
  contentType,
  addHeaders
} = {}) => Object.freeze({
  [Headers.FSPIOP.SOURCE]: source,
  ...(destination && { [Headers.FSPIOP.DESTINATION]: destination }),
  ...(proxy && { [Headers.FSPIOP.PROXY]: proxy }),
  date,
  accept,
  'content-type': contentType || accept,
  ...(addHeaders && { ...addHeaders })
})

const partiesParamsDto = ({
  Type = 'MSISDN',
  ID = String(Date.now()),
  SubId
} = {}) => ({
  Type,
  ID,
  ...(SubId && { SubId })
})

const protocolVersionsDto = () => ({
  CONTENT: {
    DEFAULT: '2.1',
    VALIDATELIST: ['2.1']
  },
  ACCEPT: {
    DEFAULT: '2',
    VALIDATELIST: ['2', '2.1']
  }
})

const partiesCallHeadersDto = ({
  source,
  destination,
  proxy,
  date,
  addHeaders
} = {}) => headersDto({
  source,
  destination,
  proxy,
  date,
  addHeaders,
  accept: interopHeader('parties', '1'),
  contentType: interopHeader('parties', '1.1')
})

const participantsCallHeadersDto = ({
  source,
  destination,
  proxy,
  date,
  acceptVersion = '1',
  contentTypeVersion = '1.1'
} = {}) => headersDto({
  source,
  destination,
  proxy,
  date,
  accept: interopHeader('participants', acceptVersion),
  contentType: interopHeader('participants', contentTypeVersion)
})

const interopHeader = (resource, version = '1') => `application/vnd.interoperability.${resource}+json;version=${version}`

const oracleRequestResponseDto = ({
  partyList = [{ fspId: 'dfspFromOracle' }]
} = {}) => ({
  data: {
    partyList
  }
})

const putPartiesSuccessResponseDto = ({
  partyIdType = 'MSISDN',
  partyId = `test-party-${randomUUID()}`,
  fspId = `fspId-${randomUUID()}`,
  partySubIdOrType = ''
} = {}) => ({
  party: {
    partyIdInfo: {
      partyIdType,
      partyIdentifier: partyId,
      ...(partySubIdOrType && { partySubIdOrType }),
      ...(fspId && { fspId })
    },
    merchantClassificationCode: '32',
    name: `testPartyName-${partyId}`
    // personalInfo: { ... }
  }
})

const postParticipantsPayloadDto = ({
  requestId = randomUUID(), // '01JE8SG3F4WNHY8B9876THQ344',
  partyList = [{
    partyIdType: 'MSISDN',
    partyIdentifier: '123456',
    fspId: 'fspId123'
  }],
  currency = 'XXX'
} = {}) => Object.freeze({
  requestId,
  partyList,
  ...(currency && { currency })
})

const errorCallbackResponseDto = ({
  errorCode = '1234',
  errorDescription = 'Error description',
  extension = [{
    key: 'k1', value: 'v1'
  }]
} = {}) => ({
  errorInformation: {
    errorCode,
    errorDescription,
    ...(extension && {
      extensionList: { extension }
    })
  }
})

const mockAlsRequestDto = (sourceId, type, partyId) => ({
  sourceId,
  type,
  partyId
})

const expiredCacheKeyDto = ({
  sourceId = 'sourceId',
  type = 'MSISDN',
  partyId = 'partyId-123',
  prefix = 'prefix'
} = {}) => `${prefix}:${sourceId}:${type}:${partyId}`

const mockHapiRequestDto = ({ // https://hapi.dev/api/?v=21.3.3#request-properties
  method = 'GET',
  traceid = randomUUID(),
  id = randomUUID()
} = {}) => ({
  method,
  headers: { traceid },
  info: {
    id,
    received: 123456789
  }
})

module.exports = {
  ...isoFixtures,
  partiesCallHeadersDto,
  partiesParamsDto,
  participantsCallHeadersDto,
  oracleRequestResponseDto,
  putPartiesSuccessResponseDto,
  postParticipantsPayloadDto,
  errorCallbackResponseDto,
  expiredCacheKeyDto,
  mockAlsRequestDto,
  protocolVersionsDto,
  mockHapiRequestDto,
  interopHeader
}
