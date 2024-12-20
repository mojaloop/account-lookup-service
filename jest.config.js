module.exports = {
  verbose: true,
  collectCoverageFrom: [
    '**/src/**/**/*.js'
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      functions: 90,
      branches: 90,
      lines: 90
    }
  },
  setupFiles: ['<rootDir>/test/unit/setup.js'],
  testMatch: ['<rootDir>/test/unit/**/*.test.js']
}
