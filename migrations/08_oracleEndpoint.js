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
 - Name Surname <name.surname@mojaloop.io>

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/

'use strict'

exports.up = (knex) => {
  return knex.schema.hasTable('oracleEndpoint').then(function (exists) {
    if (!exists) {
      return knex.schema.createTable('oracleEndpoint', (t) => {
        t.increments('oracleEndpointId').primary().notNullable()
        t.integer('partyIdTypeId').unsigned().notNullable()
        t.foreign('partyIdTypeId').references('partyIdTypeId').inTable('partyIdType')
        t.integer('endpointTypeId').unsigned().notNullable()
        t.foreign('endpointTypeId').references('endpointTypeId').inTable('endpointType')
        t.string('currencyId')
        t.foreign('currencyId').references('currencyId').inTable('currency')
        t.string('value', 512).notNullable()
        t.boolean('isDefault').defaultTo(false).notNullable()
        t.boolean('isActive').defaultTo(true).notNullable()
        t.dateTime('createdDate').defaultTo(knex.fn.now()).notNullable()
        t.string('createdBy', 128).notNullable()
      })
    }
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('oracleEndpoint')
}
