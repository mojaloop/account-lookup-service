'use strict'

const Test = require('ava')
const Hapi = require('@hapi/hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Mockgen = require('../../util/mockgen.js')
const helper = require('../../util/helper')

/**
 * summary: Get Health
 * description: The HTTP request GET /health is used to get the status of the server
 * parameters: type, currency, accept, content-type, date
 * produces: application/json
 * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
 */
Test('test Health get operation', async function (t) {
  // console.log('test Health get operation_1')

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
      path: '/health',
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
  t.is(response.statusCode, 200, 'Ok response status')
})
