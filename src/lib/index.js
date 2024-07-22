const { loggerFactory, asyncStorage } = require('@mojaloop/central-services-logger/src/contextLogger')

const logger = loggerFactory() // global logger without context

module.exports = {
  logger,
  loggerFactory,
  asyncStorage
}
