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

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 --------------
 **********/

const RedisMock = require('ioredis-mock')

/*
   ioredis-mock doesn't provide a status-field, so we need to override it here
  */
class MockIoRedis extends RedisMock {
  connected = false
  /**
      @param opts RedisOptions
    */
  constructor (opts) {
    super(opts)
    this.lazyConnect = Boolean(opts?.lazyConnect)
  }

  get status () {
    return this.connected ? 'ready' : this.lazyConnect ? 'wait' : 'end'
  }
}

class IoRedisMockCluster extends MockIoRedis {
  /**
       @param nodesList BasicConnectionConfig[]
       @param redisOptions RedisClusterOptions
    */
  constructor (nodesList, redisOptions) {
    super(redisOptions)
    this._nodes = []
    nodesList.forEach((connOpts) => this._nodes.push(new MockIoRedis({ ...connOpts, ...redisOptions })))
  }

  nodes () {
    return this._nodes
  }
}

MockIoRedis.Cluster = IoRedisMockCluster

module.exports = {
  MockIoRedis
}
