const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  setupFiles: ['<rootDir>/test/integration/setup.js'],
  testMatch: ['<rootDir>/test/integration/**/*.test.js'],
  reporters: ['default', 'jest-junit']
}
