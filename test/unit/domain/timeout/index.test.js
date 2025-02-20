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

const Participant = require('../../../../src/models/participantEndpoint/facade')
const TimeoutDomain = require('../../../../src/domain/timeout')
const Metrics = require('@mojaloop/central-services-metrics')

describe('Timeout Domain', () => {
  // Initialize Metrics for testing
  Metrics.getCounter(
    'errorCount',
    'Error count',
    ['code', 'system', 'operation', 'step']
  )

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Participant, 'validateParticipant').mockResolvedValue({})
    jest.spyOn(Participant, 'sendErrorToParticipant').mockResolvedValue({})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('timeoutInterschemePartiesLookups', () => {
    describe('timeoutInterschemePartiesLookups', () => {
      it('should process expired ALS keys', async () => {
        const mockCache = { processExpiredAlsKeys: jest.fn() }
        await TimeoutDomain.timeoutInterschemePartiesLookups({ proxyCache: mockCache, batchSize: 10 })
        expect(mockCache.processExpiredAlsKeys).toHaveBeenCalledWith(TimeoutDomain.sendTimeoutCallback, 10)
      })
    })

    describe('sendTimeoutCallback', () => {
      it('should send error to participant', async () => {
        jest.spyOn(Participant, 'validateParticipant').mockResolvedValue({ fspId: 'sourceId' })

        const cacheKey = 'als:sourceId:2:3:expiresAt'
        const [, destination] = cacheKey.split(':')

        await TimeoutDomain.sendTimeoutCallback(cacheKey)

        expect(Participant.validateParticipant).toHaveBeenCalledWith('sourceId')
        expect(Participant.sendErrorToParticipant).toHaveBeenCalledWith(
          destination,
          'FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR',
          { errorInformation: { errorCode: '3300', errorDescription: 'Generic expired error' } },
          expect.any(Object), expect.any(Object), undefined, expect.any(Object)
        )
      })

      it('should throw error if participant validation fails', async () => {
        Participant.validateParticipant.mockResolvedValue(null)
        await expect(TimeoutDomain.sendTimeoutCallback('als:sourceId:2:3:expiresAt')).rejects.toThrow()
      })
    })
  })
})
