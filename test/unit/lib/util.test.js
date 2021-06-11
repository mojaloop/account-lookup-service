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
const path = require('path')

describe('Util', () => {
  it('pathForInterface should return correct path', async () => {
    const apiPath = Util.pathForInterface({isAdmin: false, isMockInterface: false });
    const expectedAPIpathResult = path.join('interface', 'api-swagger.yaml')
    expect(apiPath).toContain(expectedAPIpathResult);
    
    const apiAdminPath = Util.pathForInterface({isAdmin: true, isMockInterface: false })
    const expectedApiAdminPath = path.join('interface','admin-swagger.yaml')
    expect(apiAdminPath).toContain(expectedApiAdminPath)
    
    const apiMockPath = Util.pathForInterface({isAdmin: false, isMockInterface: true })
    const expectedApiMockPath = path.join('interface', 'api_swagger.json')
    expect(apiMockPath).toContain(expectedApiMockPath)
    
    const apiAdminMockPath = Util.pathForInterface({isAdmin: true, isMockInterface: true })
    const expectedApiAdminMockPath = path.join('interface', 'admin_swagger.json')
    expect(apiAdminMockPath).toContain(expectedApiAdminMockPath)
    
    Config.FEATURE_ENABLE_EXTENDED_PARTY_ID_TYPE = true
    
    const apiExtendedPath = Util.pathForInterface({isAdmin: false, isMockInterface: false })
    const expectedApiExtendedPath = path.join('interface','thirdparty', 'api-swagger.yaml')
    expect(apiExtendedPath).toContain(expectedApiExtendedPath)
    
    const apiExtendedAdminPath = Util.pathForInterface({isAdmin: true, isMockInterface: false })
    const expectedApiExtendedAdminPath = path.join('interface','thirdparty', 'admin-swagger.yaml')
    expect(apiExtendedAdminPath).toContain(expectedApiExtendedAdminPath)
    
    const apiExtendedMockPath = Util.pathForInterface({isAdmin: false, isMockInterface: true })
    const expectedApiExtendedMockPath = path.join('interface', 'thirdparty','api_swagger.json')
    expect(apiExtendedMockPath).toContain(expectedApiExtendedMockPath)
    
    const apiExtendedAdminMockPath = Util.pathForInterface({isAdmin: true, isMockInterface: true })
    const expectedApiExtendedAdminMockPath = path.join('interface','thirdparty', 'admin_swagger.json')
    expect(apiExtendedAdminMockPath).toContain(expectedApiExtendedAdminMockPath)
  })
})
