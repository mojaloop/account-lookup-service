'use strict'

const Test = require('ava')
const Hapi = require('@hapi/hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Sinon = require('sinon')

const Mockgen = require('../../util/mockgen')
const helper = require('../../util/helper')

let sandbox

Test.beforeEach(async () => {
  sandbox = Sinon.createSandbox()
})

Test.afterEach(async () => {
  sandbox.restore()
})

/**
 * summary: Participants
 * description: The HTTP request POST /participants is used to create information in the server regarding the provided list of identities. This request should be used for bulk creation of FSP information for more than one Party. The optional currency parameter should indicate that each provided Party supports the currency
 * parameters: body, Accept, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
 * produces: application/json
 * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
 */

Test('test Participants Post operation', async function (t) {
  const server = new Hapi.Server()

  await server.register({
    plugin: HapiOpenAPI,
    options: {
      api: Path.resolve(__dirname, '../../../src/interface/api_swagger.json'),
      handlers: Path.join(__dirname, '../../../src/handlers'),
      outputvalidation: true
    }
  })

  const requests = new Promise((resolve, reject) => {
    Mockgen().requests({
      path: '/participants',
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

  const response = await server.inject(options)
  await server.stop()
  t.is(response.statusCode, 500, 'Ok response status')
})
