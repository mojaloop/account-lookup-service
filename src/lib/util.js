const Enum = require('@mojaloop/central-services-shared').Enum

const getSpanTags = ({ payload, headers, params }, transactionType, transactionAction) => {
  const tags = {
    transactionType,
    transactionAction,
    transactionId: (payload && payload.transactionId) || (params && params.id),
    quoteId: (payload && payload.quoteId) || (params && params.id),
    source: headers[Enum.Http.Headers.FSPIOP.SOURCE],
    destination: headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  }
  if (payload && payload.payee && payload.payee.partyIdInfo && payload.payee.partyIdInfo.fspId) {
    tags.payeeFsp = payload.payee.partyIdInfo.fspId
  }
  if (payload && payload.payer && payload.payer.partyIdInfo && payload.payer.partyIdInfo.fspId) {
    tags.payerFsp = payload.payer.partyIdInfo.fspId
  }
  return tags
}

module.exports = {
  getSpanTags
}
