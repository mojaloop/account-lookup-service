/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

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

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 --------------
 **********/

const axios = require('axios')
const { createProxyCache } = require('@mojaloop/inter-scheme-proxy-cache-lib')

const config = require('../../../src/lib/config')
const fixtures = require('../../fixtures')
const { ProxyApiClient } = require('../../util')
const { PAYER_DFSP, PARTY_ID_TYPE } = require('../constants')

const proxyClient = new ProxyApiClient() // mock ISPA

const alsUrl = `http://localhost:${config.API_PORT}`

describe('Parties Endpoints Tests -->', () => {
  const { type, proxyConfig } = config.proxyCacheConfig
  const proxyCache = createProxyCache(type, proxyConfig)

  beforeAll(async () => {
    await proxyCache.connect()
  })

  afterAll(async () => {
    await proxyCache.disconnect()
  })

  describe('GET /parties... endpoints tests -->', () => {
    test('should do GET /parties/{Type}/{ID} call to proxy', async () => {
      const partyId = 'PT123456789'
      const url = `${alsUrl}/parties/${PARTY_ID_TYPE}/${partyId}`
      const headers = fixtures.partiesCallHeadersDto({
        source: PAYER_DFSP,
        destination: ''
      })
      const alsReq = fixtures.mockAlsRequestDto(PAYER_DFSP, PARTY_ID_TYPE, partyId)
      let isExists = await proxyCache.receivedSuccessResponse(alsReq)
      expect(isExists).toBe(false)

      let history = await proxyClient.deleteHistory()
      expect(history).toEqual([])

      const result = await axios.request({ url, headers })
      expect(result.status).toBe(202)

      await new Promise(resolve => setTimeout(resolve, 1000))
      history = await proxyClient.getHistory()
      expect(history.length).toBe(2)
      expect(history[0].path).toBe(`/oracle/participants/${PARTY_ID_TYPE}/${partyId}`)
      expect(history[1].path).toBe(`/parties/${PARTY_ID_TYPE}/${partyId}`)

      isExists = await proxyCache.receivedSuccessResponse(alsReq)
      expect(isExists).toBe(true)
    })
    // todo: add test of sending PUT /parties callback
  })
})
