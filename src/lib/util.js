const util = require('util')
const Path = require('path')
const Enum = require('@mojaloop/central-services-shared').Enum
const { HeaderValidation, Hapi } = require('@mojaloop/central-services-shared').Util
const Config = require('../lib/config')
const { logger } = require('./index')
const { rethrow } = require('@mojaloop/central-services-shared').Util

const getSpanTags = ({ headers }, transactionType, transactionAction) => {
  const tags = {
    transactionType,
    transactionAction
  }
  if (headers && headers[Enum.Http.Headers.FSPIOP.SOURCE]) {
    tags.source = headers[Enum.Http.Headers.FSPIOP.SOURCE]
  }
  if (headers && headers[Enum.Http.Headers.FSPIOP.DESTINATION]) {
    tags.destination = headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  }
  return tags
}

const pathForInterface = ({ isAdmin, isMockInterface }) => {
  let apiFile
  let pathFolder

  if (Config.FEATURE_ENABLE_EXTENDED_PARTY_ID_TYPE) {
    pathFolder = '../interface/thirdparty/'
  } else {
    pathFolder = '../interface/'
  }

  if (isAdmin) {
    if (isMockInterface) {
      apiFile = 'admin_swagger.json'
    } else {
      apiFile = 'admin-swagger.yaml'
    }
  } else {
    if (isMockInterface) {
      apiFile = 'api_swagger.json'
    } else {
      apiFile = Config.API_TYPE === Hapi.API_TYPES.iso20022
        ? 'api-swagger-iso20022-parties.yaml'
        : 'api-swagger.yaml'
    }
  }
  return Path.resolve(__dirname, pathFolder + apiFile)
}

/**
 * @function getStackOrInspect
 * @description Gets the error stack, or uses util.inspect to inspect the error
 * @param {*} err - An error object
 */
function getStackOrInspect (err) {
  return err?.stack || util.inspect(err)
}

const rethrowAndCountFspiopError = (error, options) => {
  options.loggerOverride = logger
  rethrow.rethrowAndCountFspiopError(error, options)
}

const rethrowDatabaseError = (error) => {
  rethrow.rethrowDatabaseError(error, { loggerOverride: logger })
}

const countFspiopError = (error, options) => {
  options.loggerOverride = logger
  rethrow.countFspiopError(error, options)
}

module.exports = {
  getSpanTags,
  pathForInterface,
  getStackOrInspect,
  hubNameConfig: {
    hubName: Config.HUB_NAME,
    hubNameRegex: HeaderValidation.getHubNameRegex(Config.HUB_NAME)
  },
  rethrowAndCountFspiopError,
  rethrowDatabaseError,
  countFspiopError
}
