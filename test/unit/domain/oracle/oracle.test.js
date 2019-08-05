/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the License) and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an AS IS BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('ava')
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const oracleDomain = require('../../../../src/domain/oracle/oracle')
const Db = require('../../../../src/lib/db')

const createOracleRequestIsDefault = {
  payload: {
    oracleIdType: 'MSISDN',
    endpoint: {
      value: 'http://localhost:8444',
      endpointType: 'URL'
    },
    isDefault: true
  }
}

const createOracleRequest = {
  payload: {
    oracleIdType: 'MSISDN',
    endpoint: {
      value: 'http://localhost:8444',
      endpointType: 'URL'
    },
    currency: 'USD'
  }
}

const partyIdTypeResponse = {
  partyIdTypeId: 1,
  name: 'MSISDN',
  description: 'A MSISDN (Mobile Station International Subscriber Directory Number, that is, the phone number)',
  isActive: true,
  createdDate: '2019-05-24 08:52:19'
}

const endpointTypeResponse = {
  endpointTypeId: 1,
  type: 'URL',
  description: 'REST URLs',
  isActive: true,
  createdDate: '2019-05-24 08:52:19'
}

const getOracleRequest = {
  query: {}
}

const getOracleDatabaseResponse = [{
  oracleEndpointId: 1,
  endpointType: 'URL',
  value: 'http://localhost:8444',
  idType: 'MSISDN',
  currency: 'USD',
  isDefault: true
}]

const getOracleResponse = [{
  oracleId: 1,
  oracleIdType: 'MSISDN',
  endpoint: {
    value: 'http://localhost:8444',
    endpointType: 'URL'
  },
  currency: 'USD',
  isDefault: true
}]

let sandbox

Test.beforeEach(() => {
  try {
    sandbox = Sinon.createSandbox()
    Db.partyIdType = {
      findOne: sandbox.stub()
    }
    Db.endpointType = {
      findOne: sandbox.stub()
    }
    Db.oracleEndpoint = {
      update: sandbox.stub(),
      insert: sandbox.stub(),
      query: sandbox.stub()
    }
    Db.partyIdType.findOne.returns(partyIdTypeResponse)
    Db.endpointType.findOne.returns(endpointTypeResponse)
    Db.oracleEndpoint.insert.returns(true)
    Db.oracleEndpoint.query.returns(getOracleDatabaseResponse)
  } catch (err) {
    Logger.error(`serverTest failed with error - ${err}`)
    console.error(err.message)
  }
})

Test.afterEach(() => {
  sandbox.restore()
})

Test('createOracle should create an oracle isDefault true', async (test) => {
  try {
    const response = await oracleDomain.createOracle(createOracleRequestIsDefault.payload)
    test.is(response, true, 'create oracle isDefault completed successfully')
  } catch (err) {
    Logger.error(`createOracle test failed with error - ${err}`)
    test.fail()
  }
})

Test('createOracle should create an oracle isDefault false', async (test) => {
  try {
    const response = await oracleDomain.createOracle(createOracleRequest.payload)
    test.is(response, true, 'create oracle completed successfully')
  } catch (err) {
    Logger.error(`createOracle test failed with error - ${err}`)
    test.fail()
  }
})

Test('createOracle should throw and error', async (test) => {
  try {
    sandbox.restore()
    Db.partyIdType = {
      findOne: sandbox.stub()
    }
    Db.partyIdType.findOne.throws(new Error())
    await oracleDomain.createOracle(createOracleRequest.payload)
    test.fail()
  } catch (err) {
    test.pass()
  }
})

Test('getOracle should get the details of the requested oracle without currency and type', async (test) => {
  try {
    const response = await oracleDomain.getOracle(getOracleRequest.query)
    test.deepEqual(response, getOracleResponse, 'get oracle without currency completed successfully')
  } catch (err) {
    Logger.error(`getOracle test failed with error - ${err}`)
    test.fail()
  }
})

Test('getOracle should get the details of the requested oracle with currency', async (test) => {
  try {
    getOracleRequest.query.currency = 'USD'
    const response = await oracleDomain.getOracle(getOracleRequest.query)
    test.deepEqual(response, getOracleResponse, 'get oracle with currency completed successfully')
  } catch (err) {
    Logger.error(`getOracle test failed with error - ${err}`)
    test.fail()
  }
})

Test('getOracle should get the details of the requested oracle with type', async (test) => {
  try {
    getOracleRequest.query.currency = undefined
    getOracleRequest.query.type = 'MSISDN'
    const response = await oracleDomain.getOracle(getOracleRequest.query)
    test.deepEqual(response, getOracleResponse, 'get oracle with type completed successfully')
  } catch (err) {
    Logger.error(`getOracle test failed with error - ${err}`)
    test.fail()
  }
})

Test('getOracle should get the details of the requested oracle with currency and type', async (test) => {
  try {
    getOracleRequest.query.currency = 'USD'
    getOracleRequest.query.type = 'MSISDN'
    const response = await oracleDomain.getOracle(getOracleRequest.query)
    test.deepEqual(response, getOracleResponse, 'get oracle with currency and type completed successfully')
  } catch (err) {
    Logger.error(`getOracle test failed with error - ${err}`)
    test.fail()
  }
})

Test('getOracle should throw and error', async (test) => {
  try {
    sandbox.restore()
    Db.oracleEndpoint = {
      query: sandbox.stub(),
      insert: sandbox.stub()
    }
    Db.oracleEndpoint.insert.returns(true)
    Db.oracleEndpoint.query.throws(new Error())
    await oracleDomain.getOracle(getOracleRequest)
    test.fail()
  } catch (err) {
    test.pass()
  }
})
