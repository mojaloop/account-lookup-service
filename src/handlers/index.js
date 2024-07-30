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

const { Command } = require('commander')
const Logger = require('@mojaloop/central-services-logger')
const Package = require('../../package.json')
const Server = require('../server')
const { HANDLER_TYPES } = require('../constants')

const Program = new Command()

Program
  .version(Package.version)
  .description('CLI to manage Handlers')

Program.command('handlers')
  .alias('h')
  .description('Start specified handler(s)')
  .option('--timeout', 'Start the Timeout Handler')
  .action(async (args) => {
    const handlers = []

    if (args.timeout) {
      Logger.isDebugEnabled && Logger.debug('CLI: Executing --timeout')
      handlers.push(HANDLER_TYPES.TIMEOUT)
    }

    if (handlers.length === 0) {
      Logger.isDebugEnabled && Logger.debug('CLI: No handlers specified')
      return
    }

    module.exports = await Server.initializeHandlers(handlers)
  })

if (Array.isArray(process.argv) && process.argv.length > 2) {
  Program.parse(process.argv)
} else {
  Program.help()
}
