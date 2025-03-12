const { Enum, Util: { Hapi } } = require('@mojaloop/central-services-shared')
const EventSdk = require('@mojaloop/event-sdk')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

const participant = require('../../models/participantEndpoint/facade')
const { TransformFacades } = require('../../lib')

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

const makePutPartiesErrorPayload = async (config, fspiopError, headers, params) => {
  const body = fspiopError.toApiErrorObject(config.ERROR_HANDLING)
  return config.API_TYPE === Hapi.API_TYPES.iso20022
    ? (await TransformFacades.FSPIOP.parties.putError({ body, headers, params })).body
    : body
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

// change signature to accept object
const createErrorHandlerOnSendingCallback = (config, logger) => async (err, headers, params, requester) => {
  try {
    logger.error('error in sending parties callback', err)
    const sendTo = requester || headers[Headers.FSPIOP.SOURCE]
    const errorCallbackEndpointType = errorPartyCbType(params.SubId)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    const errInfo = await makePutPartiesErrorPayload(config, fspiopError, headers, params)

    await participant.sendErrorToParticipant(sendTo, errorCallbackEndpointType, errInfo, headers, params)

    logger.info('handleErrorOnSendingCallback in done', { sendTo, params, errInfo })
    return fspiopError
  } catch (exc) {
    // We can't do anything else here- we _must_ handle all errors _within_ this function because
    // we've already sent a sync response- we cannot throw.
    logger.error('failed to handleErrorOnSendingCallback. No further processing!', exc)
  }
}

module.exports = {
  getPartyCbType,
  putPartyCbType,
  errorPartyCbType,
  makePutPartiesErrorPayload,
  finishSpanWithError,
  createErrorHandlerOnSendingCallback,
  alsRequestDto,
  swapSourceDestinationHeaders
}
