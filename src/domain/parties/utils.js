const { Enum } = require('@mojaloop/central-services-shared')
const EventSdk = require('@mojaloop/event-sdk')

const { FspEndpointTypes } = Enum.EndPoints
const { Headers } = Enum.Http

const getPartyCbType = (partySubId) => partySubId
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET

const putPartyCbType = (partySubId) => partySubId
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT

const errorPartyCbType = (partySubId) => partySubId
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR

const finishSpanWithError = async (childSpan, fspiopError) => {
  if (childSpan && !childSpan.isFinished) {
    if (fspiopError) {
      const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
      await childSpan.error(fspiopError, state)
      await childSpan.finish(fspiopError.message, state)
    } else {
      await childSpan.finish()
    }
  }
}

const alsRequestDto = (sourceId, params) => ({
  sourceId,
  type: params.Type,
  partyId: params.ID
})

const swapSourceDestinationHeaders = (headers) => {
  const {
    [Headers.FSPIOP.SOURCE]: source,
    [Headers.FSPIOP.DESTINATION]: destination,
    [Headers.FSPIOP.PROXY]: proxy,
    ...restHeaders
  } = headers
  return {
    ...restHeaders,
    [Headers.FSPIOP.SOURCE]: destination,
    [Headers.FSPIOP.DESTINATION]: source
  }
}

module.exports = {
  getPartyCbType,
  putPartyCbType,
  errorPartyCbType,
  finishSpanWithError,
  alsRequestDto,
  swapSourceDestinationHeaders
}
