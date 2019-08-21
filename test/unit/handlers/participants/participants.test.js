/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('ava')
const Mockgen = require('../../../util/mockgen.js')
const Helper = require('../../../util/helper')
const { startTestAPIServer } = require('../../../_helpers')

const app = () => ({
  domain: {
    participants: {
      postParticipantsBatch: () => {}
    }
  },
})

Test.beforeEach(startTestAPIServer(app))

Test.afterEach(async t => {
  await t.context.server.stop()
})

Test('test postParticipantsBatch endpoint', async test => {
  const { server } = test.context;
  const requests = new Promise((resolve, reject) => {
    Mockgen().requests({
      path: '/participants',
      operation: 'post'
    }, function (error, mock) {
      return error ? reject(error) : resolve(mock)
    })
  })

  const mock = await requests
  test.pass(mock)
  test.pass(mock.request)
  const options = {
    method: 'post',
    url: mock.request.path,
    headers: Helper.defaultSwitchHeaders
  }
  if (mock.request.body) {
    // Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    // Send the request form data
    options.payload = mock.request.formData
    // Set the Content-Type as application/x-www-form-urlencoded
    options.headers = Helper.defaultSwitchHeaders || {}
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = Helper.defaultSwitchHeaders
  }
  const response = await server.inject(options)
  test.is(response.statusCode, 200, 'Ok response status')
})

Test('test postParticipantsBatch endpoint - error', async test => {
  const { server } = test.context;
  const requests = new Promise((resolve, reject) => {
    Mockgen().requests({
      path: '/participants',
      operation: 'post'
    }, function (error, mock) {
      return error ? reject(error) : resolve(mock)
    })
  })

  const mock = await requests
  test.pass(mock)
  test.pass(mock.request)
  const options = {
    method: 'post',
    url: mock.request.path,
    headers: Helper.defaultSwitchHeaders
  }
  if (mock.request.body) {
    // Send the request body
    options.payload = mock.request.body
  } else if (mock.request.formData) {
    // Send the request form data
    options.payload = mock.request.formData
    // Set the Content-Type as application/x-www-form-urlencoded
    options.headers = Helper.defaultSwitchHeaders || {}
  }
  // If headers are present, set the headers.
  if (mock.request.headers && mock.request.headers.length > 0) {
    options.headers = Helper.defaultSwitchHeaders
  }
  server.app.domain.participants.postParticipantsBatch = () => { throw new Error('whatever') }
  const response = await server.inject(options)
  test.is(response.statusCode, 500, 'Response should fail')
})
