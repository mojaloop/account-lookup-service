require('./setup')

const { logger } = require('../../src/lib')
const { onboarding } = require('../util')
const { PROXY_NAME, PAYER_DFSP } = require('../integration/constants')

const pause = async (ms = 1000) => new Promise(resolve => {
  logger.info(`pause for ${ms / 1000} sec....`)
  setTimeout(resolve, ms)
})

const prepareTestParticipants = async () => {
  await pause(15_000) // sometimes on CircleCI env we have error: socket hang up
  await onboarding.createHubAccounts()
  await pause()

  await onboarding.createTestParticipant({ name: PAYER_DFSP })
  await onboarding.createTestParticipant({
    name: PROXY_NAME,
    isProxy: true
  })

  await onboarding.createOracle()
  logger.info('prepareTestParticipants is finished')
}

prepareTestParticipants().catch(err => {
  logger.error('error in prepareTestParticipants: ', err)
  throw err
})
