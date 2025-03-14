module.exports = {
  verbose: true,
  clearMocks: true,

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
  maxWorkers: '50%',
  setupFiles: ['<rootDir>/test/unit/setup.js'],
  testMatch: ['<rootDir>/test/unit/**/*.test.js']
}
