/*****
 License
 ******/

'use strict'

const Test = require('ava')
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const request = require('../../../../src/lib/request')
const util = require('../../../../src/lib/util')
const Helper = require('../../../util/helper')
const DB = require('../../../../src/lib/db')
const participant = require('../../../../src/models/participantEndpoint/facade')
const oracle = require('../../../../src/models/oracle/facade')

let sandbox

Test.beforeEach(() => {
  sandbox = Sinon.createSandbox()
  sandbox.stub(request)
  DB.oracleEndpoint = {
    query: sandbox.stub()
  }
})

Test.afterEach(() => {
  sandbox.restore()
})

Test('getPartiesByTypeAndID should send a callback results to a callback url', async (t) => {
  try {
    request.sendRequest.withArgs(Helper.validatePayerFspUri, Helper.defaultSwitchHeaders, 'get', undefined, false).returns(Promise.resolve({}))
    DB.oracleEndpoint.query.returns(Helper.getOracleEndpointDatabaseResponse)
    request.sendRequest.withArgs(Helper.oracleGetCurrencyUri, Helper.getByTypeIdCurrencyRequest.headers, Helper.getByTypeIdCurrencyRequest.method, undefined, true)



    // test.deepEqual(?, ?, 'get Participant by Type and Id completed successfully')
    // } catch (err) {
    //   Logger.error(`get Participant by Type and Id test failed with error - ${err}`)
    //   test.fail()
    // }

  } catch (e) {
    t.fail()
  }
})