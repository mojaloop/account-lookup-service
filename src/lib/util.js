const util = require('util')
const Path = require('path')
const Enum = require('@mojaloop/central-services-shared').Enum
const Config = require('../lib/config')

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
      apiFile = 'api-swagger.yaml'
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

module.exports = {
  getSpanTags,
  pathForInterface,
  getStackOrInspect
}
