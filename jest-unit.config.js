const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  setupFiles: ['<rootDir>/test/unit/setup.js'],
  testMatch: ['<rootDir>/test/unit/**/*.test.js']
}
