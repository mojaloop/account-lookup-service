'use strict'

const Sinon = require('sinon')
const OracleEndpointUncached = require('../../../../src/models/oracle/oracleEndpoint')
const Cache = require('../../../../src/lib/cache')
const Model = require('../../../../src/models/oracle/oracleEndpointCached')
const Db = require('../../../../src/lib/db')
const Logger = require('@mojaloop/central-services-logger')

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
    sandbox.stub(Cache)
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    sandbox.stub(OracleEndpointUncached, 'getOracleEndpointByTypeAndCurrency').returns(oracleEndpoints)
    sandbox.stub(OracleEndpointUncached, 'getOracleEndpointByCurrency').returns(oracleEndpoints)
    sandbox.stub(OracleEndpointUncached, 'getOracleEndpointByType').returns(oracleEndpoints)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('initializes cache correctly', async () => {
    const cacheClient = {
      createKey: sandbox.stub().returns({})
    }
    Cache.registerCacheClient.returns(cacheClient)

    // initialize calls registerCacheClient and createKey
    expect(Cache.registerCacheClient.calledOnce).toBeFalsy()
    expect(cacheClient.createKey.calledOnce).toBeFalsy()
    await Model.initialize()
    expect(Cache.registerCacheClient.calledOnce).toBeTruthy()
  })

  it('getOracleEndpointByTypeAndCurrency calls correct uncached function', async () => {
    let cache = null
    const cacheClient = {
      createKey: sandbox.stub().returns({}),
      get: () => cache,
      set: (key, x) => {
        cache = { item: x } // the cache returns {item: <data>} structure
      }
    }
    Cache.registerCacheClient.returns(cacheClient)
    await Model.initialize()

    await Model.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD')
    expect(OracleEndpointUncached.getOracleEndpointByTypeAndCurrency.calledOnce).toBeTruthy()
  })

  it('getOracleEndpointByType calls correct uncached function', async () => {
    let cache = null
    const cacheClient = {
      createKey: sandbox.stub().returns({}),
      get: () => cache,
      set: (key, x) => {
        cache = { item: x } // the cache returns {item: <data>} structure
      }
    }
    Cache.registerCacheClient.returns(cacheClient)
    await Model.initialize()
    await Model.getOracleEndpointByType('MSISDN')
    expect(OracleEndpointUncached.getOracleEndpointByType.calledOnce).toBeTruthy()
  })

  it('getOracleEndpointByCurrency calls correct uncached function', async () => {
    let cache = null
    const cacheClient = {
      createKey: sandbox.stub().returns({}),
      get: () => cache,
      set: (key, x) => {
        cache = { item: x } // the cache returns {item: <data>} structure
      }
    }
    Cache.registerCacheClient.returns(cacheClient)
    await Model.initialize()

    await Model.getOracleEndpointByCurrency('USD')
    expect(OracleEndpointUncached.getOracleEndpointByCurrency.calledOnce).toBeTruthy()
  })

  it('queries call set on null cache', async () => {
    const cache = null
    const cacheClient = {
      createKey: sandbox.stub().returns({}),
      get: () => cache,
      set: sandbox.stub().returns({})
    }
    Cache.registerCacheClient.returns(cacheClient)
    await Model.initialize()

    await Model.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD')
    expect(cacheClient.set.called).toBeTruthy()
  })

  it('queries hit cache when item is found', async () => {
    const cacheClient = {
      createKey: sandbox.stub().returns({}),
      get: sandbox.stub().returns({ item: oracleEndpoints }),
      set: sandbox.stub().returns({})
    }
    Cache.registerCacheClient.returns(cacheClient)
    await Model.initialize()

    await Model.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD')
    expect(cacheClient.get.called).toBeTruthy()
  })
})
