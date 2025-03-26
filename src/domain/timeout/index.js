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
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * INFITX
 - Steven Oderayi <steven.oderayi@infitx.com>

 --------------
 ******/
'use strict'

const {
  Factory: { createFSPIOPError, reformatFSPIOPError },
  Enums: { FSPIOPErrorCodes }
} = require('@mojaloop/central-services-error-handling')
const {
  EventStateMetadata,
  EventStatusType,
  AuditEventAction
} = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')

const Participant = require('../../models/participantEndpoint/facade')
const { ERROR_MESSAGES } = require('../../constants')
const { logger } = require('../../lib')
const { countFspiopError } = require('../../lib/util')
const { timeoutCallbackDto } = require('./dto')

const timeoutInterschemePartiesLookups = async ({ proxyCache, batchSize }) => {
  logger.info('timeoutInterschemePartiesLookups start...', { batchSize })
  return proxyCache.processExpiredAlsKeys(sendTimeoutCallback, batchSize)
}

const timeoutProxyGetPartiesLookups = async ({ proxyCache, batchSize }) => {
  logger.info('timeoutProxyGetPartiesLookups start...', { batchSize })
  return proxyCache.processExpiredProxyGetPartiesKeys(sendTimeoutCallback, batchSize)
}

const sendTimeoutCallback = async (cacheKey) => {
  const histTimerEnd = Metrics.getHistogram(
    'eg_timeoutInterschemePartiesLookups',
    'Egress - Interscheme parties lookup timeout callback',
    ['success']
  ).startTimer()
  let step
  const [destination, partyType, partyId] = parseCacheKey(cacheKey)
  const { errorInformation, params, headers, endpointType, span } = await timeoutCallbackDto({ destination, partyId, partyType })
  const log = logger.child({ destination, partyId })
  log.verbose('sendTimeoutCallback details:', { errorInformation, cacheKey, partyType })

  try {
    step = 'validateParticipant-1'
    await validateParticipant(destination, log)
    await span.audit({ headers, errorInformation }, AuditEventAction.start)
    step = 'sendErrorToParticipant-2'
    await Participant.sendErrorToParticipant(destination, endpointType, errorInformation, headers, params, undefined, span)
    histTimerEnd({ success: true })
  } catch (err) {
    log.warn('error in sendTimeoutCallback: ', err)
    histTimerEnd({ success: false })
    const fspiopError = reformatFSPIOPError(err)
    countFspiopError(fspiopError, { operation: 'sendTimeoutCallback', step })

    await finishSpan(span, fspiopError)
    throw fspiopError
  }
}

const validateParticipant = async (fspId, log) => {
  const participant = await Participant.validateParticipant(fspId)
  if (!participant) {
    const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
    log.error(`error in validateParticipant: ${errMessage}`)
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

const parseCacheKey = (cacheKey) => {
  const [destination, partyType, partyId] = cacheKey.split(':').slice(-3)
  return [destination, partyType, partyId]
}

module.exports = {
  timeoutInterschemePartiesLookups,
  timeoutProxyGetPartiesLookups,
  sendTimeoutCallback // Exposed for testing
}
