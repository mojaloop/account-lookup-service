require('./setup')

const Logger = require('@mojaloop/central-services-logger')
const { onboarding } = require('../util')
const { PROXY_NAME, PAYER_DFSP } = require('../integration/constants')

const pause = async (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms))

const prepareTestParticipants = async () => {
  await pause(2000)
  await onboarding.createHubAccounts()
  await pause()

  await onboarding.createTestParticipant({ name: PAYER_DFSP })
  await onboarding.createTestParticipant({
    name: PROXY_NAME,
    isProxy: true
  })

  await onboarding.createOracle()
  Logger.info('prepareTestParticipants is finished')
}

prepareTestParticipants().catch(err => {
  Logger.error(err)
  throw err
})
