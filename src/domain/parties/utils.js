const { Enum } = require('@mojaloop/central-services-shared')
const EventSdk = require('@mojaloop/event-sdk')

const { FspEndpointTypes } = Enum.EndPoints

const getPartyCbType = (partySubIdOrType) => partySubIdOrType
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET

const putPartyCbType = (partySubIdOrType) => partySubIdOrType
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT

const errorPartyCbType = (partySubIdOrType) => partySubIdOrType
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR

const finishSpanWithError = async (childSpan, fspiopError) => {
  if (childSpan && !childSpan.isFinished && fspiopError) {
    const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
    await childSpan.error(fspiopError, state)
    await childSpan.finish(fspiopError.message, state)
  }
}

module.exports = {
  getPartyCbType,
  putPartyCbType,
  errorPartyCbType,
  finishSpanWithError
}
