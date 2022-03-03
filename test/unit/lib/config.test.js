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
 - Name Surname <name.surname@gatesfoundation.com>

 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/
'use strict'

const src = '../../../src/'

const configImport = `${src}/lib/config`
jest.mock(configImport)

describe('Config tests', () => {

  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should load successfully', async () => {
    // Setup
    let Config = null
    let isSuccess
    // set env var
    process.env.ALS_ENDPOINT_SECURITY__JWS__JWS_SIGN = true

    // Act
    try {
      Config = jest.requireActual(configImport)
      isSuccess = true
    } catch (e) {
      isSuccess = false
    }

    // Assert
    expect(Config != null).toBe(true)
    expect(isSuccess).toBe(true)
  })

  it('should parse ENV var ALS_PROTOCOL_VERSIONS__ACCEPT__VALIDATELIST as a string', async () => {
    // Setup
    let Config = null
    let isSuccess
    const validateList = ['1']
    // set env var
    process.env.ALS_PROTOCOL_VERSIONS__CONTENT__VALIDATELIST = JSON.stringify(validateList)
    process.env.ALS_PROTOCOL_VERSIONS__ACCEPT__VALIDATELIST = JSON.stringify(validateList)

    // Act
    try {
      Config = jest.requireActual(configImport)
      isSuccess = true
    } catch (e) {
      isSuccess = false
    }

    // Assert
    expect(Config != null).toBe(true)
    expect(isSuccess).toBe(true)
    expect(Config.PROTOCOL_VERSIONS.CONTENT.VALIDATELIST).toMatchObject(validateList)
    expect(Config.PROTOCOL_VERSIONS.ACCEPT.VALIDATELIST).toMatchObject(validateList)
  })

  it('should should throw error when file not found', async () => {
    // Setup
    let Config = null
    let error = null
    let isSuccess
    const validateList = ['1']
    // set env var
    process.env.ALS_ENDPOINT_SECURITY__JWS__JWS_SIGN = true
    process.env.ALS_ENDPOINT_SECURITY__JWS__JWS_SIGNING_KEY_PATH = '/fake/path'

    // Act
    try {
      Config = jest.requireActual(configImport)
      isSuccess = true
    } catch (e) {
      isSuccess = false
      error = e
    }

    // Assert
    expect(isSuccess).toBe(false)
    expect(error.message).toBe('File doesn\'t exist')
  })
})
