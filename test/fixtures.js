const { randomUUID } = require('node:crypto')
const { Enum } = require('@mojaloop/central-services-shared')

const { Headers } = Enum.Http

const headersDto = ({
  source = 'fromDfsp',
  destination = 'toDfsp',
  proxy = '',
  date = '2024-05-24 08:52:19',
  accept
} = {}) => Object.freeze({
  [Headers.FSPIOP.SOURCE]: source,
  ...(destination && { [Headers.FSPIOP.DESTINATION]: destination }),
  ...(proxy && { [Headers.FSPIOP.PROXY]: proxy }),
  date,
  accept,
  'content-type': accept
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
  accept: 'application/vnd.interoperability.parties+json;version=1.1'
})

const participantsCallHeadersDto = ({
  source,
  destination,
  proxy,
  date
} = {}) => headersDto({
  source,
  destination,
  proxy,
  date,
  accept: 'application/vnd.interoperability.participants+json;version=1'
})

const oracleRequestResponseDto = ({
  partyList = [{ fspId: 'dfspFromOracle' }]
} = {}) => ({
  data: {
    partyList
  }
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
  partiesCallHeadersDto,
  participantsCallHeadersDto,
  oracleRequestResponseDto,
  errorCallbackResponseDto,
  mockAlsRequestDto,
  protocolVersionsDto,
  mockHapiRequestDto
}
