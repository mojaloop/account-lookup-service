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
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation
 * Name Surname <name.surname@mojaloop.io>

 * Kevin Leyow <kevin.leyow@infitx.com>

 --------------
 ******/

'use strict'

const Sinon = require('sinon')
const OracleEndpointUncached = require('../../../../src/models/oracle/oracleEndpoint')
const Cache = require('../../../../src/lib/cache')
const Model = require('../../../../src/models/oracle/oracleEndpointCached')
const Db = require('../../../../src/lib/db')
const Logger = require('@mojaloop/central-services-logger')
const Config = require('../../../../src/lib/config')
Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED = true

Logger.isDebugEnabled = jest.fn(() => true)
Logger.isErrorEnabled = jest.fn(() => true)
Logger.isInfoEnabled = jest.fn(() => true)
let sandbox

describe('ParticipantCurrency cached model', () => {
  const oracleEndpoints = [
    {
      oracleEndpointId: 1,
      partyIdType: 1, // MSISDN
      endpointTypeId: 1, // URL
      currencyId: 'USD',
      value: 'http://endpoint',
      isDefault: 1,
      isActive: 1,
      createdDate: '2023-11-16 14:57:55',
      createdBy: 'Admin'
    }
  ]
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    // sandbox.stub(Cache)
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    sandbox.stub(OracleEndpointUncached, 'getOracleEndpointByTypeAndCurrency').returns(oracleEndpoints)
    sandbox.stub(OracleEndpointUncached, 'getOracleEndpointByCurrency').returns(oracleEndpoints)
    sandbox.stub(OracleEndpointUncached, 'getOracleEndpointByType').returns(oracleEndpoints)
    sandbox.stub(OracleEndpointUncached, 'assertPendingAcquires').returns()
  })

  afterEach(() => {
    Cache.dropClients()
    sandbox.restore()
  })

  it('initializes cache correctly', async () => {
    // initialize calls registerCacheClient and createKey
    sandbox.spy(Cache)
    expect(Cache.registerCacheClient.calledOnce).toBeFalsy()
    await Model.initialize()
    expect(Cache.registerCacheClient.calledOnce).toBeTruthy()
  })

  it('getOracleEndpointByTypeAndCurrency calls correct uncached function', async () => {
    await Model.initialize()
    await Cache.initCache()

    await Model.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD')
    expect(OracleEndpointUncached.getOracleEndpointByTypeAndCurrency.calledOnce).toBeTruthy()
  })

  it('getOracleEndpointByType calls correct uncached function', async () => {
    await Model.initialize()
    await Cache.initCache()

    await Model.getOracleEndpointByType('MSISDN')
    expect(OracleEndpointUncached.getOracleEndpointByType.calledOnce).toBeTruthy()
  })

  it('getOracleEndpointByCurrency calls correct uncached function', async () => {
    await Model.initialize()
    await Cache.initCache()

    await Model.getOracleEndpointByCurrency('USD')
    expect(OracleEndpointUncached.getOracleEndpointByCurrency.calledOnce).toBeTruthy()
  })

  it('queries hit cache when item is found', async () => {
    await Model.initialize()
    await Cache.initCache()

    await Model.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD')
    expect(OracleEndpointUncached.getOracleEndpointByTypeAndCurrency.calledOnce).toBeTruthy()

    // Second call should hit cache
    await Model.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD')
    expect(OracleEndpointUncached.getOracleEndpointByTypeAndCurrency.calledOnce).toBeTruthy()
  })
  it('getOracleEndpointCached calls assertPendingAcquire when assertPendingAcquire is true', async () => {
    await Model.initialize()
    await Cache.initCache()

    await Model.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD', true)
    expect(OracleEndpointUncached.assertPendingAcquires.calledOnce).toBeTruthy()
  })

  it('getOracleEndpointCached does not call assertPendingAcquire when assertPendingAcquire is false', async () => {
    await Model.initialize()
    await Cache.initCache()

    await Model.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD', false)
    expect(OracleEndpointUncached.assertPendingAcquires.called).toBeFalsy()
  })
})
