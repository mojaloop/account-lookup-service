const { MockIoRedis } = require('./mocks')
jest.mock('ioredis', () => MockIoRedis)

Object.assign(process.env, {
  LOG_LEVEL: 'debug'
  // override any other env vars needed for unit-tests
})
