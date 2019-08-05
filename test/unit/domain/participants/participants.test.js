/*****
 License
 ******/

'use strict'

const Test = require('ava')
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const participantsDomain = require('../../../../src/domain/participants/participants')
const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints
const request = require('@mojaloop/central-services-shared').Util.Request
const Enums = require('@mojaloop/central-services-shared').Enum
const Helper = require('../../../util/helper')
const DB = require('../../../../src/lib/db')
const Config = require('../../../../src/lib/config')

let sandbox

Test.beforeEach(async () => {
  await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
  sandbox = Sinon.createSandbox()
  sandbox.stub(request)
  DB.oracleEndpoint = {
    query: sandbox.stub()
  }
})

Test.afterEach(() => {
  sandbox.restore()
})

Test.serial('getParticipantsByTypeAndID should send a callback request to the requester', async (t) => {
  try {
    request.sendRequest.withArgs(Helper.validatePayerFspUri, Helper.defaultSwitchHeaders).returns(Promise.resolve({}))
    DB.oracleEndpoint.query.returns(Helper.getOracleEndpointDatabaseResponse)
    request.sendRequest.withArgs(Helper.oracleGetCurrencyUri, Helper.getByTypeIdCurrencyRequest.headers, Helper.getByTypeIdCurrencyRequest.method, undefined, true).returns(Promise.resolve(Helper.getOracleResponse))
    request.sendRequest.withArgs(Helper.getPayerfspEndpointsUri, Helper.defaultSwitchHeaders).returns(Promise.resolve(Helper.getEndPointsResponse))
    request.sendRequest.withArgs(Helper.getEndPointsResponse.data[0].value, Helper.getByTypeIdCurrencyRequest.headers, Enums.Http.RestMethods.PUT, Helper.fspIdPayload).returns(Promise.resolve({}))
    await participantsDomain.getParticipantsByTypeAndID(Helper.getByTypeIdCurrencyRequest.headers, Helper.getByTypeIdCurrencyRequest.params, Helper.getByTypeIdCurrencyRequest.method, Helper.getByTypeIdCurrencyRequest.query)
    t.is(request.sendRequest.callCount, 4, 'send request called 4 times')
  } catch (e) {
    Logger.error(`getParticipantsByTypeAndID test failed with error - ${e}`)
    t.fail()
  }
})

Test.serial('postParticipantsByTypeAndID should send a callback request to the requester', async (t) => {
  try {
    request.sendRequest.withArgs(Helper.validatePayerFspUri, Helper.defaultSwitchHeaders).returns(Promise.resolve({}))
    DB.oracleEndpoint.query.returns(Helper.getOracleEndpointDatabaseResponse)
    request.sendRequest.withArgs(Helper.oracleGetCurrencyUri, Helper.postByTypeIdCurrencyRequest.headers, Helper.postByTypeIdCurrencyRequest.method, undefined, true).returns(Promise.resolve())
    request.sendRequest.withArgs(Helper.getPayerfspEndpointsUri, Helper.defaultSwitchHeaders).returns(Promise.resolve(Helper.getEndPointsResponse))
    request.sendRequest.withArgs(Helper.getEndPointsResponse.data[0].value, Helper.getByTypeIdCurrencyRequest.headers, Enums.Http.RestMethods.POST, Helper.fspIdPayload).returns(Promise.resolve({}))
    await participantsDomain.postParticipants(Helper.getByTypeIdCurrencyRequest.headers, Helper.getByTypeIdCurrencyRequest.params, Helper.getByTypeIdCurrencyRequest.method, Helper.getByTypeIdCurrencyRequest.query)
    t.is(request.sendRequest.callCount, 4, 'send request called 4 times')
  } catch (e) {
    Logger.error(`postParticipantsByTypeAndID test failed with error - ${e}`)
    t.fail()
  }
})
