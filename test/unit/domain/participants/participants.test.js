/*****
 License
 ******/

'use strict'

const Test = require('ava')
const Sinon = require('sinon')
const participantsDomain = require('../../../../src/domain/participants/participants')
const participant = require('../../../../src/models/participantEndpoint/participantEndpoint')
const request = require('../../../../src/lib/request')
const Enums = require('../../../../src/lib/enum')
const Helper = require('../../../util/helper')
const DB = require('../../../../src/lib/db')
const util = require('../../../../src/lib/util')

let sandbox

Test.beforeEach(async () => {
  await participant.initializeCache()
  sandbox = Sinon.createSandbox()
  sandbox.stub(request)
  sandbox.stub(util, 'defaultHeaders').returns(Helper.defaultSwitchHeaders)
  DB.oracleEndpoint = {
    query: sandbox.stub()
  }
})

Test.afterEach(() => {
  sandbox.restore()
})

Test('getParticipantsByTypeAndID should send a callback request to the requester', async (t) => {
  try {
    request.sendRequest.withArgs(Helper.validatePayerFspUri, Helper.defaultSwitchHeaders).returns(Promise.resolve({}))
    DB.oracleEndpoint.query.returns(Helper.getOracleEndpointDatabaseResponse)
    request.sendRequest.withArgs(Helper.oracleGetCurrencyUri, Helper.getByTypeIdCurrencyRequest.headers, Helper.getByTypeIdCurrencyRequest.method, undefined, true).returns(Promise.resolve(Helper.getOracleResponse))
    request.sendRequest.withArgs(Helper.getPayerfspEndpointsUri, Helper.defaultSwitchHeaders).returns(Promise.resolve(Helper.getEndPointsResponse))
    request.sendRequest.withArgs(Helper.getEndPointsResponse.data[0].value, Helper.getByTypeIdCurrencyRequest.headers, Enums.restMethods.PUT, Helper.fspIdPayload).returns(Promise.resolve({}))
    await participantsDomain.getParticipantsByTypeAndID(Helper.getByTypeIdCurrencyRequest)
    t.is(request.sendRequest.callCount, 4, 'send request called 4 times')
  } catch (e) {
    t.fail()
  }
})