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

const { setTimeout: sleep } = require('node:timers/promises')
const { PROXY_PORT } = require('#test/integration/constants')
const BasicApiClient = require('./BasicApiClient')

const baseURL = `http://localhost:${PROXY_PORT}`

class ProxyApiClient extends BasicApiClient {
  constructor (deps) {
    super({ ...deps, baseURL })
  }

  async getHistory () {
    const { data } = await this.sendRequest({ url: '/history' })
    this.log.verbose('getHistory response data: ', { data })
    return data.history
  }

  async deleteHistory () {
    const { data } = await this.sendRequest({
      url: '/history',
      method: 'DELETE'
    })
    return data.history
  }

  async waitForNHistoryCalls (N, retryMaxCount = 20, retryIntervalSec = 2) {
    // check that the callbacks are sent and received at the FSP
    // for test resilience, we will retry the history check a few times
    let retryCount = 0
    let history = []

    while (history.length < N && retryCount < retryMaxCount) {
      await sleep(retryIntervalSec * 1000)
      history = await this.getHistory()
      retryCount++
    }
    this.log.info('waitForNHistoryCalls is done: ', { history })

    return history
  }
}

module.exports = ProxyApiClient
