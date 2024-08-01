const { createProxyCache } = require('@mojaloop/inter-scheme-proxy-cache-lib')
const { PAYER_DFSP, PARTY_ID_TYPE, PROXY_NAME } = require('../../constants')
const fixtures = require('../../../fixtures')
const { ProxyApiClient } = require('../../../util')
const config = require('../../../../src/lib/config')

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

describe('Timeout Handler', () => {
  const { type, proxyConfig } = config.PROXY_CACHE_CONFIG
  const proxyCache = createProxyCache(type, proxyConfig)
  const proxyClient = new ProxyApiClient()

  beforeAll(async () => {
    await proxyCache.connect()
    const redisClient = proxyCache.redisClient
    const redisNodes = redisClient.nodes ? redisClient.nodes('master') : [redisClient]
    await Promise.all(redisNodes.map(async node => {
      await node.flushall()
    }))
  })

  afterAll(async () => {
    return Promise.all([
      proxyClient.deleteHistory(),
      proxyCache.disconnect()
    ])
  })

  it('test', async () => {
    let history = await proxyClient.deleteHistory()
    expect(history).toEqual([])

    // send a couple of keys to redis
    const partyIds = ['1234567', '7654321']
    const keys = [
      `'als:${PAYER_DFSP}:${PARTY_ID_TYPE}:${partyIds[0]}:expiresAt'`,
      `'als:${PAYER_DFSP}:${PARTY_ID_TYPE}:${partyIds[1]}:expiresAt'`
    ]
    const proxies = [PROXY_NAME]
    const alsReq1 = fixtures.mockAlsRequestDto(PAYER_DFSP, PARTY_ID_TYPE, partyIds[0])
    const alsReq2 = fixtures.mockAlsRequestDto(PAYER_DFSP, PARTY_ID_TYPE, partyIds[1])
    const results = await Promise.all([
      proxyCache.setSendToProxiesList(alsReq1, proxies),
      proxyCache.setSendToProxiesList(alsReq2, proxies)
    ])
    expect(results.includes(false)).toBe(false)

    // wait for the timeout handler to process the keys
    await wait(35_000)

    // check that the keys are no longer in redis
    const exists = await Promise.all(keys.map(key => proxyCache.redisClient.exists(key)))
    expect(exists.includes(1)).toBe(false)

    // check that the callbacks are sent and received at the FSP
    // for test resilience, we will retry the history check a few times
    let retryCount = 0; const retryMaxCount = 10; const retryInterval = 2000
    while (history.length < 2 && retryCount < retryMaxCount) {
      await wait(retryInterval)
      history = await proxyClient.getHistory()
      retryCount++
    }
    expect(history.length).toBe(2)
    const path0 = history.find(h => h.path.includes(partyIds[0])).path
    const path1 = history.find(h => h.path.includes(partyIds[1])).path
    expect(path0).toBe(`/parties/${PARTY_ID_TYPE}/${partyIds[0]}/error`)
    expect(path1).toBe(`/parties/${PARTY_ID_TYPE}/${partyIds[1]}/error`)
  }, 60_000)
})
