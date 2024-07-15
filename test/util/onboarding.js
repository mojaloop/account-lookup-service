const axios = require('axios')
const { FspEndpointTypes } = require('@mojaloop/central-services-shared').Enum.EndPoints
const Logger = require('@mojaloop/central-services-logger')
const config = require('../../src/lib/config')
const fixtures = require('../fixtures')
const { CL_PORT, PROXY_HOST, PROXY_PORT, PARTY_ID_TYPE } = require('../integration/constants')

const alsAdminUrl = `http://localhost:${config.ADMIN_PORT}`
const clUrl = `http://localhost:${CL_PORT}`
const proxyUrl = `http://${PROXY_HOST}:${PROXY_PORT}`

const headers = {
  'Cache-Control': 'no-cache',
  'Content-Type': 'application/json',
  'FSPIOP-Source': 'util.createTestParticipant'
}

const pause = async (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms))

const createHubAccounts = async ({
  currency = 'EUR',
  hubName = config.HUB_NAME
} = {}) => {
  const opts = { headers }

  const accTypes = ['HUB_RECONCILIATION', 'HUB_MULTILATERAL_SETTLEMENT']
  const accCreating = accTypes.map(type => axios.post(`${clUrl}/participants/${hubName}/accounts`, {
    currency, type
  }, opts))
  const accounts = await Promise.all(accCreating)

  const settlModel = await axios.post(`${clUrl}/settlementModels`, {
    name: 'DEFERREDNET',
    settlementGranularity: 'NET',
    settlementInterchange: 'MULTILATERAL',
    settlementDelay: 'DEFERRED',
    requireLiquidityCheck: true,
    ledgerAccountType: 'POSITION',
    autoPositionReset: true,
    currency,
    settlementAccountType: 'SETTLEMENT'
  }, opts)

  Logger.info('createHubAccounts is finished')
  return {
    accounts,
    settlModel
  }
}

const endpoints = [
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT,
    value: `${proxyUrl}/participants/{{partyIdType}}/{{partyIdentifier}}`
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
    value: `${proxyUrl}/participants/{{partyIdType}}/{{partyIdentifier}}/error`
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET,
    value: `${proxyUrl}/parties/{{partyIdType}}/{{partyIdentifier}}`
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT,
    value: `${proxyUrl}/parties/{{partyIdType}}/{{partyIdentifier}}`
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
    value: `${proxyUrl}/parties/{{partyIdType}}/{{partyIdentifier}}/error`
  }
]

const createTestParticipant = async ({
  name = `testDfsp-${Date.now()}`,
  currency = 'EUR',
  isProxy = false
} = {}) => {
  const opts = { headers }

  const participantCreated = await axios.post(`${clUrl}/participants`, {
    name, currency, isProxy
  }, opts)
  await pause()

  const createEpUrl = `${clUrl}/participants/${name}/endpoints`
  const addedEPs = []

  for (const ep of endpoints) {
    addedEPs.push(await axios.post(createEpUrl, ep, opts))
  }

  Logger.info(`createTestParticipant ${name} is finished`)
  return {
    participantCreated,
    addedEPs
  }
}

const createOracle = async ({
  oracleIdType = PARTY_ID_TYPE,
  currency = 'EUR',
  endpointValue = `${proxyUrl}/oracle`,
  isDefault = true
} = {}) => {
  const headers = fixtures.participantsCallHeadersDto()
  const body = {
    oracleIdType,
    endpoint: {
      value: endpointValue,
      endpointType: 'URL'
    },
    currency,
    isDefault
  }
  const oracle = await axios.post(`${alsAdminUrl}/oracles`, body, { headers })

  Logger.info('createOracle is finished')
  return oracle
}

// const deleteAllOracles = async ({
//   oracleIdType = 'MSISDN',
//   currency = 'EUR',
//   endpointValue = `${proxyUrl}/oracle`,
//   isDefault = false
// } = {}) => {
//   const headers = fixtures.participantsCallHeadersDto()
//   const body = {
//     oracleIdType,
//     endpoint: {
//       value: endpointValue,
//       endpointType: 'URL'
//     },
//     currency,
//     isDefault
//   }
//   const oracle = await axios.post(`${alsAdminUrl}/oracles`, body, { headers })
//
//   Logger.info(`createOracle is finished`)
//   return oracle
// }

module.exports = {
  createHubAccounts,
  createTestParticipant,
  createOracle
}
