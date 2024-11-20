const {
  Factory: { createFSPIOPError },
  Enums: { FSPIOPErrorCodes }
} = require('@mojaloop/central-services-error-handling')
const {
  Http: { Headers: { FSPIOP: FSPIOPHeaders } },
  Events: { Event: { Type: EventType, Action: EventAction } },
  EndPoints: { FspEndpointTypes }
} = require('@mojaloop/central-services-shared').Enum
const { Tracer } = require('@mojaloop/event-sdk')
const { API_TYPES } = require('@mojaloop/central-services-shared').Util.Hapi

const { TransformFacades } = require('../../lib')
const LibUtil = require('../../lib/util')
const Config = require('../../lib/config')

// todo: move to a shared place
const makeErrorPayload = async (config, fspiopError, headers, params) => {
  const body = fspiopError.toApiErrorObject(config.ERROR_HANDLING)
  return config.API_TYPE === API_TYPES.iso20022
    ? (await TransformFacades.FSPIOP.parties.putError({ body, headers, params })).body
    : body
}

const timeoutCallbackDto = async ({ destination, partyId, partyType }) => {
  const headers = {
    [FSPIOPHeaders.SOURCE]: Config.HUB_NAME,
    [FSPIOPHeaders.DESTINATION]: destination
  }
  const params = {
    ID: partyId,
    Type: partyType
  }
  const error = createFSPIOPError(FSPIOPErrorCodes.EXPIRED_ERROR)

  const dto = {
    errorInformation: await makeErrorPayload(Config, error, headers, params),
    headers,
    params,
    endpointType: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
  }
  const span = Tracer.createSpan('timeoutInterschemePartiesLookups', { headers: dto.headers })
  const spanTags = LibUtil.getSpanTags({ headers: dto.headers }, EventType.PARTY, EventAction.PUT)
  span.setTags(spanTags)

  return { ...dto, span }
}

module.exports = {
  makeErrorPayload,
  timeoutCallbackDto
}
