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
/* istanbul ignore file */

'use strict'

const Server = require('./server')
const PJson = require('../package.json')
const { Command } = require('commander')
const Config = require('./lib/config')
const Logger = require('@mojaloop/central-services-logger')

const Program = new Command()

Program
  .version(PJson.version)
  .description('CLI to manage Servers')

Program.command('server') // sub-command name, coffeeType = type, required
  .alias('s') // alternative sub-command is `o`
  .description('Start the ALS services. Use options to specify server type of none to run both') // command description
  .option('--api', 'Start the api server')
  .option('--admin', 'Start the admin server')

  // function to execute when command is uses
  .action(async (args) => {
    if (args.api) {
      Logger.debug('CLI: Executing --api')
      const options = {
        port: Config.API_PORT,
        isAPI: true
      }
      module.exports = Server.initialize(options.port, options.isAPI)
    } else if (args.admin) {
      Logger.debug('CLI: Executing --admin')
      const options = {
        port: Config.ADMIN_PORT,
        isAPI: false
      }
      module.exports = Server.initialize(options.port, options.isAPI)
    } else {
      const optionsAdmin = {
        port: Config.ADMIN_PORT,
        isAPI: false
      }
      module.exports = Server.initialize(optionsAdmin.port, optionsAdmin.isAPI)
      const optionsApi = {
        port: Config.API_PORT,
        isAPI: true
      }
      module.exports = Server.initialize(optionsApi.port, optionsApi.isAPI)
    }
  })

if (Array.isArray(process.argv) && process.argv.length > 1) {
  // parse command line vars
  Program.parse(process.argv)
} else {
  // display default help
  Program.help()
}
