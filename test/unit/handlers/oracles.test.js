'use strict'

const Test = require('ava')
const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Mockgen = require('../../util/mockgen.js')
const oracle = require('../../../src/domain/oracle')
const Sinon = require('sinon')
const helper = require('../../util/helper')
const Logger = require('@mojaloop/central-services-shared').Logger

let getResponse = [{
  oracleId: '1',
  oracleIdType: 'MSISDN',
  endpoint: {
    value: 'http://localhost:8444',
    endpointType: 'URL'
  },
  isDefault: true
}]

let sandbox

Test.beforeEach(async () => {
  sandbox = Sinon.createSandbox()
})

Test.afterEach(async () => {
  sandbox.restore()
})

/**
 * summary: Get Oracles
 * description: The HTTP request GET /oracles is used to return the list of all oracle endpoints. There are optional fields for type and currency i.e. /admin/oracles?type=MSISDN&amp;currency=USD which can be used to get more filtered results or a specific entry
 * parameters: type, currency, accept, content-type, date
 * produces: application/json
 * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
 */
<<<<<<< HEAD
Test('test OracleGet get operation', async function (t) {
  // console.log('test OracleGet get operation_1')
=======
Test.serial('test OracleGet get operation', async function (t) {

>>>>>>> 2dbe78f65b0a35df54e8788229af3da98caf3ee2
  const server = new Hapi.Server()

  await server.register({
    plugin: HapiOpenAPI,
    options: {
      api: Path.resolve(__dirname, '../../../src/interface/admin_swagger.json'),
      handlers: Path.join(__dirname, '../../../src/handlers'),
      outputvalidation: true
    }
  })

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
  //Get the resolved path from mock request
  //Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: 'get',
    url: mock.request.path,
    headers: helper.defaultAdminHeaders()
  }
  if (mock.request.body) {
    //Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    //Send the request form data
    options.payload = mock.request.formData
    //Set the Content-Type as application/x-www-form-urlencoded
    options.headers = options.headers || {}
    options.headers = helper.defaultAdminHeaders()
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = mock.request.headers
  }
  sandbox.stub(oracle, 'getOracle').returns(Promise.resolve(getResponse))
  const response = await server.inject(options)
  await server.stop()
  t.is(response.statusCode, 200, 'Ok response status')
})

Test.serial('test OracleGet throws error', async function (t) {
  sandbox.stub(oracle, 'getOracle').throws(new Error('Error Thrown'))
  const server = new Hapi.Server()
  await server.register({
    plugin: HapiOpenAPI,
    options: {
      api: Path.resolve(__dirname, '../../../src/interface/admin_swagger.json'),
      handlers: Path.join(__dirname, '../../../src/handlers'),
      outputvalidation: false
    }
  })

  await server.ext([
    {
      type: 'onPreResponse',
      method: (request, h) => {
        if (!request.response.isBoom) {
          Logger.info('Not Boom error')
        } else {
          const error = request.response
          error.message = {
            errorInformation: {
              errorCode: error.statusCode,
              errorDescription: error.message,
              extensionList:[{
                key: '',
                value: ''
              }]
            }
          }
          error.reformat()
        }
        return h.continue
      }
    }
  ])

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
  //Get the resolved path from mock request
  //Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: 'get',
    url: mock.request.path,
    headers: helper.defaultAdminHeaders()
  }
  if (mock.request.body) {
    //Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    //Send the request form data
    options.payload = mock.request.formData
    //Set the Content-Type as application/x-www-form-urlencoded
    options.headers = options.headers || {}
    options.headers = helper.defaultAdminHeaders()
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = mock.request.headers
  }
  const response = await server.inject(options)
  await server.stop()
  t.is(response.statusCode, 400, 'Error thrown')
})

/**
 * summary: Create Oracles
 * description: The HTTP request POST /oracles is used to create information in the server regarding the provided oracles. This request should be used for creation of Oracle information.
 * parameters: body, accept, content-length, content-type, date
 * produces: application/json
 * responses: 201, 400, 401, 403, 404, 405, 406, 501, 503
 */
// <<<<<<< HEAD
// Test('test OraclePost post operation', async function (t) {
//     console.log('test OracleGet get operation_2')
// =======
Test.serial('test OraclePost post operation', async function (t) {
  sandbox.stub()
// >>>>>>> 2dbe78f65b0a35df54e8788229af3da98caf3ee2
  const server = new Hapi.Server()

  await server.register({
    plugin: HapiOpenAPI,
    options: {
      api: Path.resolve(__dirname, '../../../src/interface/admin_swagger.json'),
      handlers: Path.join(__dirname, '../../../src/handlers'),
      outputvalidation: true
    }
  })

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
  //Get the resolved path from mock request
  //Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: 'post',
    url: mock.request.path,
    headers: helper.defaultAdminHeaders()
  }
  if (mock.request.body) {
    //Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    //Send the request form data
    options.payload = mock.request.formData
    //Set the Content-Type as application/x-www-form-urlencoded
    options.headers = options.headers || {}
    options.headers = helper.defaultAdminHeaders()
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = mock.request.headers
  }
  sandbox.stub(oracle, 'createOracle').returns(Promise.resolve({}))
  const response = await server.inject(options)
  await server.stop()
  t.is(response.statusCode, 201, 'Ok response status')
})

Test.serial('test OraclePost post operation throws error', async function (t) {
  const server = new Hapi.Server()

  await server.register({
    plugin: HapiOpenAPI,
    options: {
      api: Path.resolve(__dirname, '../../../src/interface/admin_swagger.json'),
      handlers: Path.join(__dirname, '../../../src/handlers'),
      outputvalidation: false
    }
  })

  await server.ext([
    {
      type: 'onPreResponse',
      method: (request, h) => {
        if (!request.response.isBoom) {
          Logger.info('Not Boom error')
        } else {
          const error = request.response
          error.message = {
            errorInformation: {
              errorCode: error.statusCode,
              errorDescription: error.message,
              extensionList:[{
                key: '',
                value: ''
              }]
            }
          }
          error.reformat()
        }
        return h.continue
      }
    }
  ])

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
  //Get the resolved path from mock request
  //Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: 'post',
    url: mock.request.path,
    headers: helper.defaultAdminHeaders()
  }
  if (mock.request.body) {
    //Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    //Send the request form data
    options.payload = mock.request.formData
    //Set the Content-Type as application/x-www-form-urlencoded
    options.headers = options.headers || {}
    options.headers = helper.defaultAdminHeaders()
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = mock.request.headers
  }
  sandbox.stub(oracle, 'createOracle').throws(new Error('Error Thrown'))
  const response = await server.inject(options)
  await server.stop()
  t.is(response.statusCode, 400, 'Error Thrown')
})

