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
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * INFITX
 - Steven Oderayi <steven.oderayi@infitx.com>
 --------------
 ******/
'use strict'

const process = require('node:process')
const { Command } = require('commander')
const Package = require('../../package.json')
const Server = require('../server')
const { HANDLER_TYPES } = require('../constants')
const Config = require('../lib/config')
const log = require('../lib').logger.child('ALS-timeout-handler')

process.on('uncaughtException', (err, origin) => {
  log.error(`uncaughtException event [origin: ${origin}]: `, err)
  process.exit(2)
})
process.on('unhandledRejection', (err) => {
  log.error('unhandledRejection event: ', err)
  process.exit(3)
})

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
      log.verbose('CLI: Executing --timeout')
      handlers.push(HANDLER_TYPES.TIMEOUT)
    }

    if (handlers.length === 0) {
      log.info('CLI: No handlers specified')
      return
    }

    module.exports = await Server.initializeHandlers(handlers, Config, log)
  })

if (Array.isArray(process.argv) && process.argv.length > 2) {
  Program.parse(process.argv)
} else {
  Program.help()
}
