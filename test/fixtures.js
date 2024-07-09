const { Enum } = require('@mojaloop/central-services-shared')

const { Headers } = Enum.Http

const partiesCallHeadersDto = ({
  source = 'fromDfsp',
  destination = 'toDfsp',
  proxy = '',
  date = '2024-05-24 08:52:19'
} = {}) => Object.freeze({
  [Headers.FSPIOP.SOURCE]: source,
  ...(destination && { [Headers.FSPIOP.DESTINATION]: destination }),
  ...(proxy && { [Headers.FSPIOP.PROXY]: proxy }),
  date,
  'content-type': 'application/vnd.interoperability.participants+json;version=1.1'
})

const oracleRequestResponseDto = ({
  partyList = [{ fspId: 'dfspFromOracle' }]
} = {}) => ({
  data: {
    partyList
  }
})

module.exports = {
  partiesCallHeadersDto,
  oracleRequestResponseDto
}
