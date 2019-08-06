'use strict'

const Test = require('ava')
const Mockgen = require('../../util/mockgen.js')
const oracle = require('../../../src/domain/oracle')
const Sinon = require('sinon')
const helper = require('../../util/helper')
const initServer = require('../../../src/server').initialize
const Db = require('../../../src/lib/db')
const getPort = require('get-port')
const Migrator = require('../../../src/lib/migrator')

const getResponse = [{
  oracleId: '1',
  oracleIdType: 'MSISDN',
  endpoint: {
    value: 'http://localhost:8444',
    endpointType: 'URL'
  },
  isDefault: true
}]

let sandbox
let server

Test.before(async () => {
  sandbox = Sinon.createSandbox()
  sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
  sandbox.stub(Migrator, 'migrate').returns(Promise.resolve({}))
  server = await initServer(await getPort(), false)
})

Test.after(async () => {
  await server.stop()
  sandbox.restore()
})

/**
 * summary: Get Oracles
 * description: The HTTP request GET /oracles is used to return the list of all oracle endpoints. There are optional fields for type and currency i.e. /admin/oracles?type=MSISDN&amp;currency=USD which can be used to get more filtered results or a specific entry
 * parameters: type, currency, accept, content-type, date
 * produces: application/json
 * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
 */

Test.serial('test OracleGet get operation', async function (t) {
  const requests = new Promise((resolve, reject) => {
    Mockgen(false).requests({
      path: '/oracles',
      operation: 'get'
    }, function (error, mock) {
      return error ? reject(error) : resolve(mock)
    })
  })

  const mock = await requests

  t.pass(mock)
  t.pass(mock.request)
  // Get the resolved path from mock request
  // Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: 'get',
    url: mock.request.path,
    headers: helper.defaultAdminHeaders()
  }
  if (mock.request.body) {
    // Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    // Send the request form data
    options.payload = mock.request.formData
    // Set the Content-Type as application/x-www-form-urlencoded
    options.headers = options.headers || {}
    options.headers = helper.defaultAdminHeaders()
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = mock.request.headers
  }
  sandbox.stub(oracle, 'getOracle').returns(Promise.resolve(getResponse))
  const response = await server.inject(options)
  t.is(response.statusCode, 200, 'Ok response status')
  oracle.getOracle.restore()
})

Test.serial('test OracleGet throws error', async function (t) {
  sandbox.stub(oracle, 'getOracle').throws(new Error('Error Thrown'))

  const requests = new Promise((resolve, reject) => {
    Mockgen(false).requests({
      path: '/oracles',
      operation: 'get'
    }, function (error, mock) {
      return error ? reject(error) : resolve(mock)
    })
  })

  const mock = await requests

  t.pass(mock)
  t.pass(mock.request)
  // Get the resolved path from mock request
  // Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: 'get',
    url: mock.request.path,
    headers: helper.defaultAdminHeaders()
  }
  if (mock.request.body) {
    // Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    // Send the request form data
    options.payload = mock.request.formData
    // Set the Content-Type as application/x-www-form-urlencoded
    options.headers = options.headers || {}
    options.headers = helper.defaultAdminHeaders()
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = mock.request.headers
  }
  const response = await server.inject(options)
  t.is(response.statusCode, 500, 'Error thrown')
  oracle.getOracle.restore()
})

/**
 * summary: Create Oracles
 * description: The HTTP request POST /oracles is used to create information in the server regarding the provided oracles. This request should be used for creation of Oracle information.
 * parameters: body, accept, content-length, content-type, date
 * produces: application/json
 * responses: 201, 400, 401, 403, 404, 405, 406, 501, 503
 */

Test.serial('test OraclePost post operation', async function (t) {
  const requests = new Promise((resolve, reject) => {
    Mockgen(false).requests({
      path: '/oracles',
      operation: 'post'
    }, function (error, mock) {
      return error ? reject(error) : resolve(mock)
    })
  })

  const mock = await requests

  t.pass(mock)
  t.pass(mock.request)
  // Get the resolved path from mock request
  // Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: 'post',
    url: mock.request.path,
    headers: helper.defaultAdminHeaders()
  }
  if (mock.request.body) {
    // Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    // Send the request form data
    options.payload = mock.request.formData
    // Set the Content-Type as application/x-www-form-urlencoded
    options.headers = options.headers || {}
    options.headers = helper.defaultAdminHeaders()
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = mock.request.headers
  }
  sandbox.stub(oracle, 'createOracle').returns(Promise.resolve({}))
  const response = await server.inject(options)
  t.is(response.statusCode, 201, 'Ok response status')
  oracle.createOracle.restore()
})

Test.serial('test OraclePost post operation throws error', async function (t) {
  const requests = new Promise((resolve, reject) => {
    Mockgen(false).requests({
      path: '/oracles',
      operation: 'post'
    }, function (error, mock) {
      return error ? reject(error) : resolve(mock)
    })
  })

  const mock = await requests

  t.pass(mock)
  t.pass(mock.request)
  // Get the resolved path from mock request
  // Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: 'post',
    url: mock.request.path,
    headers: helper.defaultAdminHeaders()
  }
  if (mock.request.body) {
    // Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    // Send the request form data
    options.payload = mock.request.formData
    // Set the Content-Type as application/x-www-form-urlencoded
    options.headers = options.headers || {}
    options.headers = helper.defaultAdminHeaders()
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = mock.request.headers
  }
  sandbox.stub(oracle, 'createOracle').throws(new Error('Error Thrown'))
  const response = await server.inject(options)
  t.is(response.statusCode, 500, 'Error Thrown')
  oracle.createOracle.restore()
})
