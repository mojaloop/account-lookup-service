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

 * Crosslake
 - Lewis Daly <lewisd@crosslaketech.com>

 --------------
 ******/

'use strict'

const request = require('request-promise-native')

const {
  TEST_ALS_HOST,
  ADMIN_PORT,
  API_PORT
} = require('../util/testConfig')

describe('plugins', () => {
  describe('API documentation - /swagger.json', () => {
    it('loads the swagger file for the admin api', async () => {
      // Arrange
      const options = {
        uri: `http://${TEST_ALS_HOST}:${ADMIN_PORT}/swagger.json`,
        json: true,
        simple: true
      }

      // Act
      const result = await request(options)

      // Assert
      expect(result.info.title).toBe('Open API for ALS Admin API')
    })

    it('loads the swagger file for the default api', async () => {
      // Arrange
      const options = {
        uri: `http://${TEST_ALS_HOST}:${API_PORT}/swagger.json`,
        json: true,
        simple: true
      }

      // Act
      const result = await request(options)

      // Assert
      expect(result.info.title).toBe('Open API for FSP Interoperability (FSPIOP) (Implementation Friendly Version)')
    })
  })
})
