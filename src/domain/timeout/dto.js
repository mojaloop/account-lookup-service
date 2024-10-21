const LibUtil = require('../../lib/util')
const Config = require('../../lib/config')
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

const timeoutCallbackDto = ({ destination, partyId, partyType }) => {
  const dto = {
    errorInformation: createFSPIOPError(FSPIOPErrorCodes.EXPIRED_ERROR).toApiErrorObject(Config.ERROR_HANDLING),
    params: { ID: partyId, Type: partyType },
    headers: { [FSPIOPHeaders.SOURCE]: Config.HUB_NAME, [FSPIOPHeaders.DESTINATION]: destination },
    endpointType: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
  }
  const span = Tracer.createSpan('timeoutInterschemePartiesLookups', { headers: dto.headers })
  const spanTags = LibUtil.getSpanTags({ headers: dto.headers }, EventType.PARTY, EventAction.PUT)
  span.setTags(spanTags)

  return { ...dto, span }
}

module.exports = { timeoutCallbackDto }
