const {
  Factory: { createFSPIOPError },
  Enums: { FSPIOPErrorCodes }
} = require('@mojaloop/central-services-error-handling')
const {
  Http: { Headers: { FSPIOP: FSPIOPHeaders } },
  Events: { Event: { Type: EventType, Action: EventAction } },
  EndPoints: { FspEndpointTypes },
  Tags: { QueryTags: QueryTagsEnum }
} = require('@mojaloop/central-services-shared').Enum
const { Tracer } = require('@mojaloop/event-sdk')
const EventFrameworkUtil = require('@mojaloop/central-services-shared').Util.EventFramework

const LibUtil = require('../../lib/util')
const Config = require('../../lib/config')
const partiesUtils = require('../parties/partiesUtils')

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
    errorInformation: await partiesUtils.makePutPartiesErrorPayload(Config, error, headers, params),
    headers,
    params,
    endpointType: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
  }
  const span = Tracer.createSpan('timeoutInterschemePartiesLookups', { headers: dto.headers })
  const spanTags = LibUtil.getSpanTags({ headers: dto.headers }, EventType.PARTY, EventAction.PUT)
  span.setTags(spanTags)
  const queryTags = EventFrameworkUtil.Tags.getQueryTags(
    QueryTagsEnum.serviceName.accountLookupService,
    QueryTagsEnum.auditType.transactionFlow,
    QueryTagsEnum.contentType.httpRequest,
    QueryTagsEnum.operation.timeoutInterschemePartiesLookups,
    {
      partyIdType: params.Type,
      partyIdentifier: params.ID
    }
  )
  span.setTags(queryTags)
  return { ...dto, span }
}

module.exports = {
  timeoutCallbackDto
}
