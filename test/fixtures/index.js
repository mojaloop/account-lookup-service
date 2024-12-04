const { randomUUID } = require('node:crypto')
const { Enum } = require('@mojaloop/central-services-shared')
const isoFixtures = require('./iso')

const { Headers } = Enum.Http

const headersDto = ({
  source = 'fromDfsp',
  destination = 'toDfsp',
  proxy = '',
  date = '2024-05-24 08:52:19',
  accept,
  contentType
} = {}) => Object.freeze({
  [Headers.FSPIOP.SOURCE]: source,
  ...(destination && { [Headers.FSPIOP.DESTINATION]: destination }),
  ...(proxy && { [Headers.FSPIOP.PROXY]: proxy }),
  date,
  accept,
  'content-type': contentType || accept
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
  date
} = {}) => headersDto({
  source,
  destination,
  proxy,
  date,
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

// todo: add ISO mode support
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
  participantsCallHeadersDto,
  oracleRequestResponseDto,
  putPartiesSuccessResponseDto,
  postParticipantsPayloadDto,
  errorCallbackResponseDto,
  mockAlsRequestDto,
  protocolVersionsDto,
  mockHapiRequestDto,
  interopHeader
}
