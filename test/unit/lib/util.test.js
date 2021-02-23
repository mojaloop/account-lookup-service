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

 - Kevin Leyow <kevin.leyow@modusbox.com>

 --------------
 ******/

'use strict'

const Util = require('../../../src/lib/util')
const Config = require('../../../src/lib/config')

describe('Util', () => {
  it('pathForInterface should return correct path', async () => {
    const apiPath = Util.pathForInterface({isAdmin: false, isMockInterface: false })
    expect(apiPath).toContain('interface/api-swagger.yaml')

    const apiAdminPath = Util.pathForInterface({isAdmin: true, isMockInterface: false })
    expect(apiAdminPath).toContain('interface/admin-swagger.yaml')

    const apiMockPath = Util.pathForInterface({isAdmin: false, isMockInterface: true })
    expect(apiMockPath).toContain('interface/api_swagger.json')

    const apiAdminMockPath = Util.pathForInterface({isAdmin: true, isMockInterface: true })
    expect(apiAdminMockPath).toContain('interface/admin_swagger.json')

    Config.FEATURE_ENABLE_EXTENDED_PARTY_ID_TYPE = true

    const apiExtendedPath = Util.pathForInterface({isAdmin: false, isMockInterface: false })
    expect(apiExtendedPath).toContain('interface/thirdparty/api-swagger.yaml')

    const apiExtendedAdminPath = Util.pathForInterface({isAdmin: true, isMockInterface: false })
    expect(apiExtendedAdminPath).toContain('interface/thirdparty/admin-swagger.yaml')

    const apiExtendedMockPath = Util.pathForInterface({isAdmin: false, isMockInterface: true })
    expect(apiExtendedMockPath).toContain('interface/thirdparty/api_swagger.json')

    const apiExtendedAdminMockPath = Util.pathForInterface({isAdmin: true, isMockInterface: true })
    expect(apiExtendedAdminMockPath).toContain('interface/thirdparty/admin_swagger.json')
  })
})
