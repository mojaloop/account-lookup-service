'use strict'

const Test = require('ava')
const Mockgen = require('../util/mockgen')
const helper = require('../util/helper')
const { startTestAPIServer } = require('../_helpers')
const assert = require('assert').strict

const app = () => ({
  domain: {
    participants: {
      postParticipantsBatch: () => {}
    },
    parties: {
      putPartiesByTypeAndID: () => {},
      getPartiesByTypeAndID: () => {},
    }
  },
})

Test.beforeEach(startTestAPIServer(app))

Test.afterEach(async t => {
  await t.context.server.stop()
})

// operation: HTTP method
// path: e.g. /participants or /parties or /parties/{Type}/{ID}
const Enums = require('@mojaloop/central-services-shared').Enum
const getMockRequest = async (operation, path) => {
  const requests = new Promise((resolve, reject) => {
    Mockgen().requests({
      path,
      operation,
    }, function (error, mock) {
      return error ? reject(error) : resolve(mock)
    })
  })

  const mock = await requests
  const resource = path.replace(/^\//, '').split('/')[0]

  assert(mock)
  assert(mock.request)
  // Get the resolved path from mock request
  // Mock request Path templates({}) are resolved using path parameters
  const options = {
    method: operation,
    url: mock.request.path,
    headers: helper.defaultSwitchHeaders(resource)
  }
  if (mock.request.body) {
    // Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    // Send the request form data
    options.payload = mock.request.formData
  }

  return options
}

Test('test parties PUT operation with missing accept header', async function (t) {
  // validation shouldn't occur when the accept header is missing and the request is not a GET
  // request
  const { server } = t.context;
  const options = await getMockRequest('put', '/parties/{Type}/{ID}')
  options.headers = {
    ...options.headers
  }
  delete options.headers['accept']

  const response = await server.inject(options)
  t.is(response.statusCode, 200, 'Ok response status')
})

Test('test parties GET operation with unacceptable version', async function (t) {
  const { server } = t.context;
  const options = await getMockRequest('get', '/parties/{Type}/{ID}')
  options.headers = {
    ...options.headers,
    accept: options.headers.accept.replace(/1.0/, '5.5')
  }

  const response = await server.inject(options)
  t.is(response.statusCode, 406, 'Not acceptable response status')
  t.is(
    response.result.errorInformation.errorDescription,
    'Unacceptable version - Unacceptable version requested'
  )
  t.is(response.result.errorInformation.errorCode, '3001')
})

Test('test parties GET operation with missing accept header', async function (t) {
  const { server } = t.context;
  const options = await getMockRequest('get', '/parties/{Type}/{ID}')
  options.headers = {
    ...options.headers
  }
  delete options.headers['accept']

  const response = await server.inject(options)
  t.is(response.statusCode, 400, 'Bad request response status')
  t.is(
    response.result.errorInformation.errorDescription,
    'Missing mandatory element - accept'
  )
  t.is(response.result.errorInformation.errorCode, '3102')
})

Test('test parties GET operation with invalid accept header', async function (t) {
  const { server } = t.context;
  const options = await getMockRequest('get', '/parties/{Type}/{ID}')
  options.headers = {
    ...options.headers,
    accept: 'blah blah'
  }

  const response = await server.inject(options)
  t.is(response.statusCode, 400, 'Bad request response status')
  t.is(
    response.result.errorInformation.errorDescription,
    'Malformed syntax - Invalid accept header'
  )
  t.is(response.result.errorInformation.errorCode, '3101')
})

Test('test parties GET operation with invalid content-type header', async function (t) {
  const { server } = t.context;
  const options = await getMockRequest('get', '/parties/{Type}/{ID}')
  options.headers = {
    ...options.headers,
    'content-type': 'fjdskalfjdkslafjdksl'
  }

  const response = await server.inject(options)
  t.is(response.statusCode, 400, 'Bad request response status')
  t.is(
    response.result.errorInformation.errorDescription,
    'Malformed syntax - Invalid content-type header'
  )
  t.is(response.result.errorInformation.errorCode, '3101')
})
