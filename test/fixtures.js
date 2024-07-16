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

module.exports = {
  partiesCallHeadersDto,
  participantsCallHeadersDto,
  oracleRequestResponseDto,
  errorCallbackResponseDto,
  mockAlsRequestDto
}
