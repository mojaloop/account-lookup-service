/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const util = require('node:util')
const Path = require('node:path')
const EventSdk = require('@mojaloop/event-sdk')
const Enum = require('@mojaloop/central-services-shared').Enum
const { HeaderValidation } = require('@mojaloop/central-services-shared').Util
const rethrow = require('@mojaloop/central-services-shared').Util.rethrow.with('ALS')

const Config = require('../lib/config')
const { API_TYPES } = require('../constants')
const { logger } = require('./index')

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
      apiFile = Config.API_TYPE === API_TYPES.iso20022
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
  options.loggerOverride = options?.log || logger
  return rethrow.countFspiopError(error, options)
}

/**
 *  An immutable object representing the step state
 * @typedef {Object} StepState
 * @property {string} step - The current step value (read-only getter property)
 * @property {(string) => void} inProgress - Method to update the current step
 */

/** @returns {StepState} */
const initStepState = (initStep = 'start') => {
  let step = initStep
  return Object.freeze({
    get step () { return step }, // or rename to current ?
    inProgress (nextStep) { step = nextStep }
  })
}

const finishSpanWithError = async (childSpan, fspiopError) => {
  if (childSpan && !childSpan.isFinished) {
    if (fspiopError) {
      const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
      await childSpan.error(fspiopError, state)
      await childSpan.finish(fspiopError.message, state)
    } else {
      await childSpan.finish()
    }
  }
}

module.exports = {
  initStepState,
  finishSpanWithError,
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
