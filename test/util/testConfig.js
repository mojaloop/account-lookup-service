/*****
 * @file This registers all handlers for the central-ledger API
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
const RC = require('rc')('ALS', require('../../config/default.json'))

/**
 * testConfig is based on the ./src/lib/config.js file,
 * with additional fields added for tests only
 */

module.exports = {
  /* Test Config */
  TEST_ALS_HOST: RC.TEST_ALS_HOST,

  /* Original Config */
  ADMIN_PORT: RC.ADMIN_PORT,
  API_PORT: RC.API_PORT,
  DATABASE_URI: RC.DATABASE_URI,
  DISPLAY_ROUTES: RC.DISPLAY_ROUTES,
  RUN_MIGRATIONS: RC.RUN_MIGRATIONS,
  ENDPOINT_CACHE_CONFIG: RC.ENDPOINT_CACHE_CONFIG,
  SWITCH_ENDPOINT: RC.SWITCH_ENDPOINT,
  INSTRUMENTATION_METRICS_DISABLED: RC.INSTRUMENTATION.METRICS.DISABLED,
  INSTRUMENTATION_METRICS_LABELS: RC.INSTRUMENTATION.METRICS.labels,
  INSTRUMENTATION_METRICS_CONFIG: RC.INSTRUMENTATION.METRICS.config
}
