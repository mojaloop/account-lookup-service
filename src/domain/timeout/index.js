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

const Enum = require('@mojaloop/central-services-shared').Enum
const Metrics = require('@mojaloop/central-services-metrics')
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const EventSdk = require('@mojaloop/event-sdk')
const LibUtil = require('../../lib/util')
const Participant = require('../../models/participantEndpoint/facade')
const ProxyCache = require('../../lib/proxyCache')
const { ERROR_MESSAGES } = require('../../constants')
const Config = require('../../lib/config')

const timeoutInterschemePartiesLookups = async () => {
  const alsKeysExpiryPattern = 'als:*:*:*:expiresAt'
  const count = 100 // @todo batch size, can be parameterized
  const redis = await ProxyCache.getClient()

  const callback = async (key) => {
    const expiresAt = await redis.get(key)
    if (Number(expiresAt) >= Date.now()) {
      return
    }
    const actualKey = key.replace(':expiresAt', '')
    try {
      await sendTimeoutCallback(actualKey)
      await Promise.all([redis.del(actualKey), redis.del(key)])
    } catch (err) {
      /**
       * We don't want to throw an error here, as it will stop the whole process
       * and we want to continue with the next keys
       * @todo We need to decide on how/when to finally give up on a key and remove it from the cache
       */
      Logger.error(err)
    }
  }

  return Promise.all(
    redis.nodes('master').map(async (node) => {
      return new Promise((resolve, reject) => {
        processNode(node, { match: alsKeysExpiryPattern, count, resolve, reject, callback })
      })
    })
  )
}

const processNode = (node, options) => {
  const stream = node.scanStream({
    match: options.match,
    count: options.count
  })
  stream.on('data', async (keys) => {
    stream.pause()
    try {
      await Promise.all(
        keys.map(async (key) => {
          return options.callback(key)
        })
      )
    } catch (err) {
      stream.destroy(err)
      options.reject(err)
    }
    stream.resume()
  })
    .on('end', () => {
      options.resolve()
    })
}

const sendTimeoutCallback = async (cacheKey) => {
  const histTimerEnd = Metrics.getHistogram(
    'eg_timeoutInterschemePartiesLookups',
    'Egress - Interscheme parties lookup timeout callback',
    ['success']
  ).startTimer()
  const span = EventSdk.Tracer.createSpan('timeoutInterschemePartiesLookups', { headers: {} })
  // eslint-disable-next-line no-unused-vars
  const [_, destination, partyType, partyId] = cacheKey.split(':')
  const source = Config.HUB_NAME
  try {
    const destinationParticipant = await Participant.validateParticipant(destination)
    if (!destinationParticipant) {
      const errMessage = ERROR_MESSAGES.partyDestinationFspNotFound
      Logger.isErrorEnabled && Logger.error(errMessage)
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.DESTINATION_FSP_ERROR, errMessage)
    }
    const errorInformation = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.EXPIRED_ERROR).toApiErrorObject(Config.ERROR_HANDLING)
    const params = { ID: partyId, type: partyType }
    const headers = { [Enum.Http.Headers.FSPIOP.SOURCE]: source, [Enum.Http.Headers.FSPIOP.DESTINATION]: destination }
    const endpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR
    const spanTags = LibUtil.getSpanTags({ headers }, Enum.Events.Event.Type.PARTY, Enum.Events.Event.Action.PUT)
    span.setTags(spanTags)
    await span.audit({ headers, errorInformation }, EventSdk.AuditEventAction.start)
    await Participant.sendErrorToParticipant(destination, endpointType, errorInformation, headers, params, undefined, span)
    histTimerEnd({ success: true })
  } catch (err) {
    histTimerEnd({ success: false })
    if (!span.isFinished) {
      const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
      const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
      await span.error(err, state)
      await span.finish(err.message, state)
    }
    throw err
  }
}

module.exports = {
  timeoutInterschemePartiesLookups
}
