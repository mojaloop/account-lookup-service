/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const { createProxyCache } = require('@mojaloop/inter-scheme-proxy-cache-lib')
const { RedisProxyCache } = require('@mojaloop/inter-scheme-proxy-cache-lib/dist/lib/storages/RedisProxyCache')
const config = require('#src/lib/config')
const fixtures = require('../../../fixtures')
const { ProxyApiClient } = require('../../../util')
const { PAYER_DFSP, PARTY_ID_TYPE, PROXY_NAME } = require('../../constants')

const wait = (sec) => new Promise(resolve => setTimeout(resolve, sec * 1000))

const CRON_TIMEOUT_SEC = 15 // see TIMEXP

jest.setTimeout(60_000)

describe('Timeout Handler', () => {
  const { type, proxyConfig } = config.PROXY_CACHE_CONFIG
  const proxyCache = createProxyCache(type, proxyConfig)
  const proxyClient = new ProxyApiClient()

  const checkKeysExistence = async (keys) => Promise.all(keys.map(key => proxyCache.redisClient.exists(key)))

  beforeAll(async () => {
    await proxyCache.connect()
    const redisClient = proxyCache.redisClient
    const redisNodes = redisClient.nodes ? redisClient.nodes('master') : [redisClient]
    await Promise.all(redisNodes.map(async node => {
      await node.flushall()
    }))
  })

  beforeEach(async () => {
    const history = await proxyClient.deleteHistory()
    expect(history).toEqual([])
  })

  afterAll(async () => {
    return Promise.all([
      proxyClient.deleteHistory(),
      proxyCache.disconnect()
    ])
  })

  it('should pass timeoutInterschemePartiesLookups flow', async () => {
    const partyIds = [`isp1-${Date.now()}`, `isp2-${Date.now()}`]
    const proxies = [PROXY_NAME]
    const alsReq1 = fixtures.mockAlsRequestDto(PAYER_DFSP, PARTY_ID_TYPE, partyIds[0])
    const alsReq2 = fixtures.mockAlsRequestDto(PAYER_DFSP, PARTY_ID_TYPE, partyIds[1])
    const keys = [
      RedisProxyCache.formatAlsCacheExpiryKey(alsReq1),
      RedisProxyCache.formatAlsCacheExpiryKey(alsReq2)
    ]
    // send a couple of keys to redis
    const results = await Promise.all([
      proxyCache.setSendToProxiesList(alsReq1, proxies, CRON_TIMEOUT_SEC),
      proxyCache.setSendToProxiesList(alsReq2, proxies, CRON_TIMEOUT_SEC)
    ])
    expect(results).toEqual([true, true])
    expect(await checkKeysExistence(keys)).toEqual([1, 1])

    // wait for the timeout handler to process the keys
    await wait(CRON_TIMEOUT_SEC * 1.5)
    const history = await proxyClient.waitForNHistoryCalls(2)

    // check that the keys are no longer in redis
    expect(await checkKeysExistence(keys)).toEqual([0, 0])

    expect(history.length).toBe(2)
    const entry0 = history.find(h => h.path.includes(partyIds[0]))
    const entry1 = history.find(h => h.path.includes(partyIds[1]))
    expect(entry0.path).toBe(`/parties/${PARTY_ID_TYPE}/${partyIds[0]}/error`)
    expect(entry1.path).toBe(`/parties/${PARTY_ID_TYPE}/${partyIds[1]}/error`)
    expect(entry0.headers['content-type']).toContain('parties')
    expect(entry1.headers['content-type']).toContain('parties')
  })

  it('should pass timeoutProxyGetPartiesLookups flow', async () => {
    const partyId1 = `pgp1-${Date.now()}`
    const partyId2 = `pgp2-${Date.now()}`
    const alsReq1 = fixtures.mockAlsRequestDto(PAYER_DFSP, PARTY_ID_TYPE, partyId1)
    const alsReq2 = fixtures.mockAlsRequestDto(PAYER_DFSP, PARTY_ID_TYPE, partyId2)
    const keys = [
      RedisProxyCache.formatProxyGetPartiesExpiryKey(alsReq1, PROXY_NAME),
      RedisProxyCache.formatProxyGetPartiesExpiryKey(alsReq2, PROXY_NAME)
    ]
    // send a couple of keys to redis
    const results = await Promise.all([
      proxyCache.setProxyGetPartiesTimeout(alsReq1, PROXY_NAME, CRON_TIMEOUT_SEC),
      proxyCache.setProxyGetPartiesTimeout(alsReq2, PROXY_NAME, CRON_TIMEOUT_SEC)
    ])
    expect(results).toEqual([true, true])
    expect(await checkKeysExistence(keys)).toEqual([1, 1])

    // wait for the timeout handler to process the keys
    await wait(CRON_TIMEOUT_SEC * 1.5)
    const history = await proxyClient.waitForNHistoryCalls(2)

    // check that the keys are no longer in redis
    expect(await checkKeysExistence(keys)).toEqual([0, 0])

    expect(history.length).toBe(2)
    const entry1 = history.find(h => h.path.includes(partyId1))
    const entry2 = history.find(h => h.path.includes(partyId2))
    expect(entry1.path).toBe(`/parties/${PARTY_ID_TYPE}/${partyId1}/error`)
    expect(entry2.path).toBe(`/parties/${PARTY_ID_TYPE}/${partyId2}/error`)
    expect(entry1.headers['content-type']).toContain('parties')
    expect(entry2.headers['content-type']).toContain('parties')
  })
})
