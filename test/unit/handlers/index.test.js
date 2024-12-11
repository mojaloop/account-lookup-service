/*****
 License
 --------------
 Copyright © 2020-2024 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0
 (the "License") and you may not use these files except in compliance with the [License](http://www.apache.org/licenses/LICENSE-2.0).

 You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the [License](http://www.apache.org/licenses/LICENSE-2.0).

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

 * INFITX
 - Steven Oderayi <steven.oderayi@infitx.com>
 --------------
 ******/

'use strict'

const Server = require('../../../src/server')
const { HANDLER_TYPES } = require('../../../src/constants')
const Config = require('../../../src/lib/config')

describe('Handlers Index', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Server, 'initializeHandlers').mockImplementation(() => {})
  })

  it('should start specified handlers in args', async () => {
    process.argv = ['node', 'index.js', 'handlers', '--timeout']
    require('../../../src/handlers/index')
    const expectedLogger = { info: expect.any(Function), error: expect.any(Function) }
    expect(Server.initializeHandlers).toHaveBeenCalledWith([HANDLER_TYPES.TIMEOUT], Config, expect.objectContaining(expectedLogger))
  })

  it('should not start any handlers if none are specified', async () => {
    process.argv = ['node', 'index.js', 'handlers']
    require('../../../src/handlers/index')
    expect(Server.initializeHandlers).not.toHaveBeenCalled()
  })
})
