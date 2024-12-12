/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 - Name Surname <name.surname@gatesfoundation.com>

 --------------
 ******/
'use strict'

const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Metrics = require('@mojaloop/central-services-metrics')

const Config = require('../../lib/config')
const oracleEndpoint = require('../../models/oracle')
const cachedOracleEndpoint = require('../../models/oracle/oracleEndpointCached')
const partyIdType = require('../../models/partyIdType')
const endpointType = require('../../models/endpointType')
const currency = require('../../models/currency')

/**
 * @function createOracle
 *
 * @description This creates and entry in the oracleEndpoint table
 *
 * @param {object} payload The payload from the Hapi server request
 */
exports.createOracle = async (payload) => {
  const histTimerEnd = Metrics.getHistogram(
    'createOracle',
    'Create Oracle',
    ['success']
  ).startTimer()
  const errorCounter = Metrics.getCounter('errorCount')
  let step

  try {
    step = 'getPartyIdTypeByName-1'
    const partyIdTypeModel = await partyIdType.getPartyIdTypeByName(payload.oracleIdType)
    step = 'getEndpointTypeByType-2'
    const endpointTypeModel = await endpointType.getEndpointTypeByType(payload.endpoint.endpointType)
    step = 'getAllOracleEndpointsByMatchCondition-3'
    const existingActiveOracle = await oracleEndpoint.getAllOracleEndpointsByMatchCondition(
      payload,
      partyIdTypeModel.partyIdTypeId,
      endpointTypeModel.endpointTypeId
    )

    if (existingActiveOracle.length > 0 && existingActiveOracle[0].isActive === 1) {
      const err = new Error('Active oracle with matching partyIdTypeId, endpointTypeId, currencyId already exists')
      Logger.isErrorEnabled && Logger.error(err)
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }

    const oracleEntity = {}
    if (payload.isDefault) {
      oracleEntity.isDefault = payload.isDefault
    } else {
      oracleEntity.isDefault = false
    }
    if (payload.currency) {
      oracleEntity.currencyId = payload.currency
    }
    oracleEntity.value = payload.endpoint.value
    oracleEntity.createdBy = 'Admin'
    oracleEntity.partyIdTypeId = partyIdTypeModel.partyIdTypeId
    oracleEntity.endpointTypeId = endpointTypeModel.endpointTypeId
    step = 'createOracleEndpoint-4'
    await oracleEndpoint.createOracleEndpoint(oracleEntity)
    histTimerEnd({ success: true })
    return true
  } catch (err) {
    histTimerEnd({ success: false })
    Logger.isErrorEnabled && Logger.error(err)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    const extensions = err.extensions || []
    const system = extensions.find((element) => element.key === 'system')?.value || ''
    errorCounter.inc({
      code: fspiopError?.apiErrorCode?.code,
      system,
      operation: 'createOracle',
      step
    })
    throw fspiopError
  }
}

/**
 * @function getOracle
 *
 * @description Retrieves list of oracles may accept query parameters
 *
 * @param {object} query The query parameters from the Hapi server request
 */
exports.getOracle = async (query) => {
  const histTimerEnd = Metrics.getHistogram(
    'getOracle',
    'Get Oracle',
    ['success']
  ).startTimer()
  const errorCounter = Metrics.getCounter('errorCount')
  let step
  try {
    let oracleEndpointModelList
    let isCurrency; let isType = false
    const oracleList = []
    if (query.currency) {
      isCurrency = true
    }
    if (query.type) {
      isType = true
    }
    if (isCurrency && isType) {
      step = 'getOracleEndpointByTypeAndCurrency-1'
      oracleEndpointModelList = await cachedOracleEndpoint.getOracleEndpointByTypeAndCurrency(query.type, query.currency)
    } else if (isCurrency && !isType) {
      step = 'getOracleEndpointByCurrency-2'
      oracleEndpointModelList = await cachedOracleEndpoint.getOracleEndpointByCurrency(query.currency)
    } else if (isType && !isCurrency) {
      step = 'getOracleEndpointByType-3'
      oracleEndpointModelList = await cachedOracleEndpoint.getOracleEndpointByType(query.type)
    } else {
      step = 'getAllOracleEndpoint-4'
      oracleEndpointModelList = await oracleEndpoint.getAllOracleEndpoint()
    }
    for (const oracleEndpointModel of oracleEndpointModelList) {
      const oracle = {
        oracleId: oracleEndpointModel.oracleEndpointId,
        oracleIdType: oracleEndpointModel.idType,
        endpoint: {
          value: oracleEndpointModel.value,
          endpointType: oracleEndpointModel.endpointType
        },
        currency: oracleEndpointModel.currency || undefined,
        isDefault: oracleEndpointModel.isDefault
      }
      oracleList.push(oracle)
    }
    histTimerEnd({ success: true })
    return oracleList
  } catch (err) {
    histTimerEnd({ success: false })
    Logger.isErrorEnabled && Logger.error(err)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    const extensions = err.extensions || []
    const system = extensions.find((element) => element.key === 'system')?.value || ''
    errorCounter.inc({
      code: fspiopError?.apiErrorCode?.code,
      system,
      operation: 'getOracle',
      step
    })
    throw fspiopError
  }
}

/**
 * @function updateOracle
 *
 * @description This process updates properties of oracle entries
 *
 * @param {object} params The parameters from the Hapi server request
 * @param {object} payload The payload from the Hapi server request
 */
exports.updateOracle = async (params, payload) => {
  const histTimerEnd = Metrics.getHistogram(
    'updateOracle',
    'Update Oracle',
    ['success']
  ).startTimer()
  const errorCounter = Metrics.getCounter('errorCount')
  let step
  try {
    step = 'getOracleEndpointById-1'
    const currentOracleEndpointList = await oracleEndpoint.getOracleEndpointById(params.ID)
    if (currentOracleEndpointList.length > 0) {
      step = 'getPartyIdTypeByName-2'
      const partyIdTypeModel = await partyIdType.getPartyIdTypeByName(payload.oracleIdType)
      step = 'getEndpointTypeByType-3'
      const endpointTypeModel = await endpointType.getEndpointTypeByType(payload.endpoint.endpointType)
      step = 'getAllOracleEndpointsByMatchCondition-4'
      const existingActiveOracle = await oracleEndpoint.getAllOracleEndpointsByMatchCondition(
        payload,
        partyIdTypeModel.partyIdTypeId,
        endpointTypeModel.endpointTypeId
      )

      if (existingActiveOracle.length > 0 && existingActiveOracle[0].isActive === 1) {
        const err = new Error('Active oracle with matching partyIdTypeId, endpointTypeId, currencyId already exists')
        Logger.isErrorEnabled && Logger.error(err)
        throw ErrorHandler.Factory.reformatFSPIOPError(err)
      }

      const currentOracleEndpoint = currentOracleEndpointList[0]
      const newOracleEntry = {}
      if (payload.oracleIdType && payload.oracleIdType !== currentOracleEndpoint.idType) {
        step = 'getPartyIdTypeByName-5'
        const partyTypeModel = await partyIdType.getPartyIdTypeByName(payload.oracleIdType)
        newOracleEntry.partyIdTypeId = partyTypeModel.partyIdTypeId
      }
      if (payload.endpoint && payload.endpoint.value && payload.endpoint.value !== currentOracleEndpoint.value) {
        newOracleEntry.value = payload.endpoint.value
      }
      if (payload.endpoint && payload.endpoint.endpointType && payload.endpoint.endpointType !== currentOracleEndpoint.endpointType) {
        step = 'getEndpointTypeByType-6'
        const endpointTypeModel = await endpointType.getEndpointTypeByType(payload.endpoint.endpointType)
        newOracleEntry.endpointTypeId = endpointTypeModel.endpointTypeId
      }
      if (payload.currency && payload.currency !== currentOracleEndpoint.currency) {
        step = 'getCurrencyById-7'
        const currencyModel = await currency.getCurrencyById(payload.currency)
        if (currencyModel) {
          newOracleEntry.currencyId = payload.currency
        } else {
          throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Invalid currency code').toApiErrorObject(Config.ERROR_HANDLING)
        }
      }
      if (payload.isDefault && payload.isDefault !== currentOracleEndpoint.isDefault) {
        newOracleEntry.isDefault = payload.isDefault
      }
      step = 'updateOracleEndpointById-8'
      await oracleEndpoint.updateOracleEndpointById(params.ID, newOracleEntry)
      histTimerEnd({ success: true })
      return true
    } else {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.ADD_PARTY_INFO_ERROR, 'Oracle not found')
    }
  } catch (err) {
    histTimerEnd({ success: false })
    Logger.isErrorEnabled && Logger.error(err)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    const extensions = err.extensions || []
    const system = extensions.find((element) => element.key === 'system')?.value || ''
    errorCounter.inc({
      code: fspiopError?.apiErrorCode?.code,
      system,
      operation: 'updateOracle',
      step
    })
    throw fspiopError
  }
}

/**
 * @function deleteOracle
 *
 * @description This process deletes an oracle endpoint by setting
 *
 * @param {object} params The parameters from the Hapi server request
 */
exports.deleteOracle = async (params) => {
  const histTimerEnd = Metrics.getHistogram(
    'deleteOracle',
    'Delete Oracle',
    ['success']
  ).startTimer()
  const errorCounter = Metrics.getCounter('errorCount')
  try {
    await oracleEndpoint.destroyOracleEndpointById(params.ID)
    histTimerEnd({ success: true })
    return true
  } catch (err) {
    histTimerEnd({ success: false })
    Logger.isErrorEnabled && Logger.error(err)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    const extensions = err.extensions || []
    const system = extensions.find((element) => element.key === 'system')?.value || ''
    errorCounter.inc({
      code: fspiopError?.apiErrorCode?.code,
      system,
      operation: 'deleteOracle'
    })
    throw fspiopError
  }
}
