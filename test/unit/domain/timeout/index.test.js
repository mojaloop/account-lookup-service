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

const Logger = require('@mojaloop/central-services-logger')
const ProxyCache = require('../../../../src/lib/proxyCache')
const Participant = require('../../../../src/models/participantEndpoint/facade')

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const mockRedisClient = ({ keys }) => {
  const streamA = { on: jest.fn(), pause: jest.fn(), resume: jest.fn(), destroy: jest.fn() }
  const streamB = { on: jest.fn(), pause: jest.fn(), resume: jest.fn(), destroy: jest.fn() }
  streamA.on.mockImplementation(async (event, callbackFn) => {
    if (event === 'data') { await callbackFn([keys[0]]) }
    if (event === 'end') { callbackFn() }
  })
  streamB.on.mockImplementation(async (event, callbackFn) => {
    if (event === 'data') await callbackFn([keys[1]])
    if (event === 'end') { callbackFn() }
  })
  const [scanStreamA, scanStreamB] = [jest.fn().mockReturnValue(streamA), jest.fn().mockReturnValue(streamB)]
  const nodes = () => ([{ scanStream: scanStreamA }, { scanStream: scanStreamB }])
  const redis = { nodes, get: jest.fn(), del: jest.fn().mockResolvedValue(1) }

  jest.spyOn(ProxyCache, 'getClient').mockResolvedValue(redis)

  return { redis, scanStreamA, scanStreamB }
}

describe('Timeout Domain', () => {
  const expiryKey1 = 'als:sourceId1:2:3:expiresAt'
  const expiryKey2 = 'als:sourceId2:2:3:expiresAt'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Participant, 'validateParticipant').mockResolvedValue({})
    jest.spyOn(Participant, 'sendErrorToParticipant').mockResolvedValue({})
  })

  describe('timeoutInterschemePartiesLookups', () => {
    it('should process all redis nodes', async () => {
      const { redis, scanStreamA, scanStreamB } = mockRedisClient({ keys: [expiryKey1, expiryKey2] })

      const { timeoutInterschemePartiesLookups } = require('../../../../src/domain/timeout')
      await timeoutInterschemePartiesLookups()
      await wait(100)

      expect(scanStreamA).toHaveBeenCalledWith({ match: 'als:*:*:*:expiresAt', count: 100 })
      expect(scanStreamB).toHaveBeenCalledWith({ match: 'als:*:*:*:expiresAt', count: 100 })
      expect(redis.del).toHaveBeenCalledWith(expiryKey1)
      expect(redis.del).toHaveBeenCalledWith(expiryKey1.replace(':expiresAt', ''))
      expect(redis.del).toHaveBeenCalledWith(expiryKey2)
      expect(redis.del).toHaveBeenCalledWith(expiryKey2.replace(':expiresAt', ''))
      expect(Participant.validateParticipant).toHaveBeenCalledTimes(2)
      expect(Participant.validateParticipant).toHaveBeenCalledWith('sourceId1')
      expect(Participant.validateParticipant).toHaveBeenCalledWith('sourceId2')
      expect(Participant.sendErrorToParticipant).toHaveBeenCalledTimes(2)
      const args1 = Participant.sendErrorToParticipant.mock.calls[0]
      const args2 = Participant.sendErrorToParticipant.mock.calls[1]
      expect(args1[0]).toBe('sourceId1')
      expect(args1[2]).toMatchObject({ errorInformation: { errorCode: '3300' } })
      expect(args2[0]).toBe('sourceId2')
      expect(args2[2]).toMatchObject({ errorInformation: { errorCode: '3300' } })
    })

    it('should not send callback if key has not expired', async () => {
      const { redis } = mockRedisClient({ keys: [expiryKey1, expiryKey2] })
      redis.get.mockResolvedValue(Date.now() + 5000)

      const { timeoutInterschemePartiesLookups } = require('../../../../src/domain/timeout')
      await timeoutInterschemePartiesLookups()
      await wait(100)

      expect(redis.del).not.toHaveBeenCalled()
      expect(redis.get).toHaveBeenCalledTimes(2)
      expect(Participant.sendErrorToParticipant).not.toHaveBeenCalled()
    })

    it('should handle error without breaking process', async () => {
      const { redis } = mockRedisClient({ keys: [expiryKey1, expiryKey2] })
      Participant.sendErrorToParticipant.mockRejectedValue(new Error('Failed to send error'))

      const { timeoutInterschemePartiesLookups } = require('../../../../src/domain/timeout')
      await timeoutInterschemePartiesLookups()
      await wait(100)

      expect(redis.del).not.toHaveBeenCalled()
      expect(redis.get).toHaveBeenCalledTimes(2)
      expect(Participant.validateParticipant).toHaveBeenCalledTimes(2)
    })

    it('should not send callback if participant validation fails', async () => {
      jest.spyOn(Logger, 'error')
      const { redis } = mockRedisClient({ keys: [expiryKey1, expiryKey2] })
      Participant.validateParticipant.mockResolvedValue(null)

      const { timeoutInterschemePartiesLookups } = require('../../../../src/domain/timeout')
      await timeoutInterschemePartiesLookups()
      await wait(100)

      expect(redis.del).not.toHaveBeenCalled()
      expect(redis.get).toHaveBeenCalledTimes(2)
      expect(Participant.validateParticipant).toHaveBeenCalledTimes(2)
      expect(Participant.sendErrorToParticipant).not.toHaveBeenCalled()
      expect(Logger.error).toHaveBeenCalledWith(new Error('Destination FSP not found'))
    })
  })
})
