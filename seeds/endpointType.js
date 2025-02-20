/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the 2020-2025 Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/
'use strict'

const { FspEndpointTypes } = require('@mojaloop/central-services-shared').Enum.EndPoints

const endpointTypes = [
  {
    type: 'URL',
    description: 'REST URLs'
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT,
    description: 'Participant callback URL to which put participant information can be sent'
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
    description: 'Participant callback URL to which put participant error information can be sent'
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET,
    description: 'Parties callback URL to which get parties information can be requested'
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT,
    description: 'Parties callback URL to which put parties information can be sent'
  },
  {
    type: FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR,
    description: 'Parties callback URL to which put participant error information can be sent'
  }
]

exports.seed = async function (knex) {
  try {
    return await knex('endpointType').insert(endpointTypes)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return -1001
    else {
      console.log(`Uploading seeds for endpointType has failed with the following error: ${err}`)
      return -1000
    }
  }
}
