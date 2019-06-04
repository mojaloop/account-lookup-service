/*****
 License
 ******/

'use strict'

const Test = require('ava')
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const request = require('../../../../src/lib/request')
const util = require('../../../../src/lib/util')
const Enums = require('../../../../src/lib/enum')
const Helper = require('../../../util/helper')
const DB = require('../../../../src/lib/db')
const partiesDomain = require('../../../../src/domain/parties/parties')
const participant = require('../../../../src/models/participantEndpoint/participantEndpoint')
//const oracle = require('../../../../src/models/oracle/facade')

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

// GET /parties/{Type}/{ID}
// GET /parties/MSISDN/123456789

Test.serial('getPartiesByTypeAndID should send a callback request to the requester', async (t) => {
  try {
    request.sendRequest.withArgs(Helper.validatePayerFspUri, Helper.defaultSwitchHeaders).returns(Promise.resolve({}))
    DB.oracleEndpoint.query.returns(Helper.getOracleEndpointDatabaseResponse)
    request.sendRequest.withArgs(Helper.oracleGetPartiesUri, Helper.getByTypeIdRequest.headers, Helper.getByTypeIdRequest.method, undefined, true).returns(Promise.resolve(Helper.getOracleResponse))
    request.sendRequest.withArgs(Helper.getPayerfspEndpointsUri, Helper.defaultSwitchHeaders).returns(Promise.resolve(Helper.getEndPointsResponse))
    request.sendRequest.withArgs(Helper.getEndPointsResponse.data[0].value, Helper.getByTypeIdRequest.headers, Enums.restMethods.GET, Helper.fspIdPayload).returns(Promise.resolve({}))
    await partiesDomain.getPartiesByTypeAndID(Helper.getByTypeIdRequest)
    t.is(request.sendRequest.callCount, 4, 'send request called 4 times')
  } catch (e) {
    Logger.error(`getPartiesByTypeAndID test failed with error - ${e}`)
    t.fail()
  }
})

Test.serial('putPartiesByTypeAndID should send a callback request to the requester', async (t) => {
  try {
    request.sendRequest.withArgs(Helper.validatePayerFspUri, Helper.defaultSwitchHeaders).returns(Promise.resolve({}))
    DB.oracleEndpoint.query.returns(Helper.getOracleEndpointDatabaseResponse)
    request.sendRequest.withArgs(Helper.oracleGetPartiesUri, Helper.putByTypeIdRequest.headers, Helper.putByTypeIdRequest.method, undefined, true).returns(Promise.resolve())
    request.sendRequest.withArgs(Helper.getPayerfspEndpointsUri, Helper.defaultSwitchHeaders).returns(Promise.resolve(Helper.getEndPointsResponse))
    request.sendRequest.withArgs(Helper.getEndPointsResponse.data[0].value, Helper.putByTypeIdRequest.headers, Enums.restMethods.PUT, Helper.fspIdPayload).returns(Promise.resolve({}))
    await partiesDomain.getPartiesByTypeAndID(Helper.putByTypeIdRequest)
    t.is(request.sendRequest.callCount, 4, 'send request called 4 times')
  } catch (e) {
    Logger.error(`putPartiesByTypeAndID test failed with error - ${e}`)
    t.fail()
  }
})
