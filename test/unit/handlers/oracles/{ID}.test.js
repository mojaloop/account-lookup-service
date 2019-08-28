'use strict'

const Test = require('ava')
const Mockgen = require('../../../util/mockgen.js')
const helper = require('../../../util/helper')
const { startTestAdminServer } = helper

const app = () => ({
  domain: {
    oracle: {
      updateOracle: () => Promise.resolve({}),
      deleteOracle: () => Promise.resolve({})
    }
  },
})

Test.beforeEach(startTestAdminServer(app))

Test.afterEach(async t => {
  await t.context.server.stop()
})

/**
 * summary: Update Oracle
 * description: The HTTP request PUT /oracles/{ID} is used to update information in the server regarding the provided oracle. This request should be used for individual update of Oracle information.
 * parameters: body, ID, content-length, content-type, date
 * produces: application/json
 * responses: 204, 400, 401, 403, 404, 405, 406, 501, 503
 */
Test('test OraclePut put operation', async function (t) {
  const { server } = t.context
  const requests = new Promise((resolve, reject) => {
    Mockgen(false).requests({
      path: '/oracles/{ID}',
      operation: 'put'
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
    method: 'put',
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
  t.is(response.statusCode, 204, 'Ok response status')
})

/**
 * summary: Delete Oracle
 * description: The HTTP request DELETE /oracles/{ID} is used to delete information in the server regarding the provided oracle.
 * parameters: accept, ID, content-type, date
 * produces: application/json
 * responses: 204, 400, 401, 403, 404, 405, 406, 501, 503
 */
Test('test OracleDelete delete operation', async function (t) {
  const { server } = t.context
  const requests = new Promise((resolve, reject) => {
    Mockgen(false).requests({
      path: '/oracles/{ID}',
      operation: 'delete'
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
    method: 'delete',
    url: '' + mock.request.path,
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
  t.is(response.statusCode, 204, 'Ok response status')
})
