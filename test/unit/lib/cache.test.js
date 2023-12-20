'use strict'

const Sinon = require('sinon')
const Config = require('../../../src/lib/config')
const Cache = require('../../../src/lib/cache')

describe('Config tests', () => {
  let sandbox
  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    Cache.registerCacheClient({
      id: 'testCacheClient',
      preloadCache: async () => sandbox.stub()
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('Cache should', () => {
    it('call constructor of CatboxMemory', async () => {
      sandbox.stub(Cache.CatboxMemory.Engine)
      const catboxMemoryConstructorSpy = sandbox.spy(Cache.CatboxMemory, 'Engine')
      await Cache.initCache()
      expect(catboxMemoryConstructorSpy.calledOnce).toBeTruthy()
      await Cache.destroyCache()
    })

    it('init+start and then stop CatboxMemory', async () => {
      sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'start')
      sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'stop')
      await Cache.initCache()
      expect(Cache.CatboxMemory.Engine.prototype.start.calledOnce).toBeTruthy()
      expect(Cache.CatboxMemory.Engine.prototype.stop.calledOnce).toBeFalsy()
      await Cache.destroyCache()
      expect(Cache.CatboxMemory.Engine.prototype.start.calledOnce).toBeTruthy()
      expect(Cache.CatboxMemory.Engine.prototype.stop.calledOnce).toBeTruthy()
    })
  })

  describe('Cache client', () => {
    it('preload should be called once during Cache.initCache()', async () => {
      let preloadCacheCalledCnt = 0
      Cache.registerCacheClient({
        id: 'testCacheClient',
        preloadCache: async () => {
          preloadCacheCalledCnt++
        }
      })

      // Test participant-getAll gets called during cache init
      expect(preloadCacheCalledCnt === 0).toBeTruthy()
      await Cache.initCache()
      expect(preloadCacheCalledCnt === 1).toBeTruthy()

      // end
      await Cache.destroyCache()
    })

    it('get() should call Catbox Memory get()', async () => {
      Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED = true
      const getSpy = sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'get')

      const cacheClient = Cache.registerCacheClient({
        id: 'testCacheClient',
        preloadCache: async () => {}
      })

      // Test get()
      expect(getSpy.called).toBeFalsy()
      await Cache.initCache()
      getSpy.resetHistory()
      await cacheClient.get('')
      expect(getSpy.called).toBeTruthy()

      // end
      await Cache.destroyCache()
    })

    it('get() should NOT call Catbox Memory get() when cache is disabled', async () => {
      Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED = false
      const getSpy = sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'get')

      const cacheClient = Cache.registerCacheClient({
        id: 'testCacheClient',
        preloadCache: async () => {}
      })

      // Test get()
      expect(getSpy.called).toBeFalsy()
      await Cache.initCache()
      getSpy.resetHistory()
      await cacheClient.get('')
      expect(getSpy.called).toBeFalsy()

      // end
      await Cache.destroyCache()
    })

    it('set() should call Catbox Memory set() and should work', async () => {
      Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED = true
      const getSpy = sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'get')
      const setSpy = sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'set')
      const cacheClient = Cache.registerCacheClient({
        id: 'testCacheClient',
        preloadCache: async () => {}
      })
      const testKey = cacheClient.createKey('testKeyName')
      const valueToCache = { a: 'some random value', b: 10 }

      // Init cache
      expect(setSpy.called).toBeFalsy()
      await Cache.initCache()
      setSpy.resetHistory()
      getSpy.resetHistory()

      // Test set()
      await cacheClient.set(testKey, valueToCache)
      expect(setSpy.called).toBeTruthy()

      // Verify the value with get()
      const valueFromCache = await cacheClient.get(testKey)
      expect(getSpy.called).toBeTruthy()
      expect(valueFromCache.item).toEqual(valueToCache)

      // end
      await Cache.destroyCache()
    })

    it('drop() works', async () => {
      Config.GENERAL_CACHE_CONFIG.CACHE_ENABLED = true
      const getSpy = sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'get')
      const setSpy = sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'set')
      const dropSpy = sandbox.spy(Cache.CatboxMemory.Engine.prototype, 'drop')
      const cacheClient = Cache.registerCacheClient({
        id: 'testCacheClient',
        preloadCache: async () => {}
      })
      const testKey = cacheClient.createKey('testKeyName')
      const valueToCache = { a: 'some random value', b: 10 }

      // Init cache
      expect(dropSpy.called).toBeFalsy()
      expect(getSpy.called).toBeFalsy()
      await Cache.initCache()
      setSpy.resetHistory()
      getSpy.resetHistory()

      // Test set()
      await cacheClient.set(testKey, valueToCache)
      expect(setSpy.called).toBeTruthy()

      // Verify the value with get()
      const valueFromCache = await cacheClient.get(testKey)
      expect(getSpy.called).toBeTruthy()
      expect(valueFromCache.item).toEqual(valueToCache)

      // Test drop()
      await cacheClient.drop(testKey)
      expect(setSpy.called).toBeTruthy()

      // Verify the value doesn't exist in cache with get()
      const valueFromCacheAfterDrop = await cacheClient.get(testKey)
      expect(getSpy.called).toBeTruthy()
      expect(valueFromCacheAfterDrop).toBeNull()

      // end
      await Cache.destroyCache()
    })
  })
})
