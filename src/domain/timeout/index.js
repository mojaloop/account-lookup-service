/*****
 License
 --------------
 Copyright © 2020-2024 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0
 (the "License") and you may not use these files except in compliance with the [License](http://www.apache.org/licenses/LICENSE-2.0).

 You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the [License](http://www.apache.org/licenses/LICENSE-2.0).

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * INFITX
 - Steven Oderayi <steven.oderayi@infitx.com>

 --------------
 ******/
'use strict'

const Metrics = require('@mojaloop/central-services-metrics')
const Participant = require('../../models/participantEndpoint/facade')
const ProxyCache = require('../../lib/proxyCache')
const { ERROR_MESSAGES } = require('../../constants')
const { timeoutCallbackDto } = require('./dto')
const {
  Factory: { createFSPIOPError, reformatFSPIOPError },
  Enums: { FSPIOPErrorCodes }
} = require('@mojaloop/central-services-error-handling')
const {
  EventStateMetadata,
  EventStatusType,
  AuditEventAction
} = require('@mojaloop/event-sdk')
const Config = require('../../lib/config')
const { logger } = require('../../lib')

const timeoutInterschemePartiesLookups = async () => {
  const count = Config.HANDLERS_TIMEOUT_BATCH_SIZE
  const proxyCache = await ProxyCache.getConnectedCache()
  return proxyCache.processExpiredAlsKeys(sendTimeoutCallback, count)
}

const sendTimeoutCallback = async (cacheKey) => {
  const histTimerEnd = Metrics.getHistogram(
    'eg_timeoutInterschemePartiesLookups',
    'Egress - Interscheme parties lookup timeout callback',
    ['success']
  ).startTimer()

  const [, destination, partyType, partyId] = cacheKey.split(':')
  const { errorInformation, params, headers, endpointType, span } = timeoutCallbackDto({ destination, partyId, partyType })

  try {
    await validateParticipant(destination)
    await span.audit({ headers, errorInformation }, AuditEventAction.start)
    await Participant.sendErrorToParticipant(destination, endpointType, errorInformation, headers, params, undefined, span)
    histTimerEnd({ success: true })
  } catch (err) {
    histTimerEnd({ success: false })
    const fspiopError = reformatFSPIOPError(err)
    finishSpan(span, fspiopError)
    throw fspiopError
  }
}

const validateParticipant = async (fspId) => {
  const participant = await Participant.validateParticipant(fspId)
  if (!participant) {
    const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
    logger.error(`error in validateParticipant: ${errMessage}`)
    throw createFSPIOPError(FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
  }
  return participant
}

const finishSpan = async (span, err) => {
  if (!span.isFinished) {
    const state = new EventStateMetadata(
      EventStatusType.failed,
      err.apiErrorCode.code,
      err.apiErrorCode.message
    )
    await span.error(err, state)
    await span.finish(err.message, state)
  }
}

module.exports = {
  timeoutInterschemePartiesLookups,
  sendTimeoutCallback // Exposed for testing
}
