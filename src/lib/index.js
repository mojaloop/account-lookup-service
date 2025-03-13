const { loggerFactory, asyncStorage } = require('@mojaloop/central-services-logger/src/contextLogger')
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')

const logger = loggerFactory('ALS') // global logger without context

module.exports = {
  logger,
  asyncStorage,
  TransformFacades
}
