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
 - Kevin Leyow <kevin.leyow@modusbox.com>

 --------------
 ******/

const Db = require('../../../../src/lib/db')
const Config = require('../../../../src/lib/config')
const Oracle = require('../../../../src/domain/oracle')
const OracleModel = require('../../../../src/models/oracle')
const EventSdk = require('@mojaloop/event-sdk')
const { assert } = require('joi')

describe('Oracle', () => {
  beforeAll(async () => {
    await Db.connect(Config.DATABASE)
  })

  afterAll(async () => {
    await Db.disconnect()
  })

  const createHeaders = {
    accept: 'application/vnd.interoperability.participants+json;version=1',
    'cache-control': 'no-cache',
    date: '',
    'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
    host: '127.0.0.1:4003',
    'accept-encoding': 'gzip, deflate',
    'content-length': 164,
    connection: 'keep-alive'
  }
  const testSpan = EventSdk.Tracer.createSpan('createOracle service')

  const ORACLE_AUD_MSISDN_URL_PAYLOAD = {
    isDefault: true,
    currency: 'AUD',
    oracleIdType: 'MSISDN',
    endpoint: {
      value: 'http://localhost:8444',
      endpointType: 'URL'
    }
  }

  const ORACLE_USD_MSISDN_URL_PAYLOAD = {
    isDefault: true,
    currency: 'USD',
    oracleIdType: 'MSISDN',
    endpoint: {
      value: 'http://localhost:8444',
      endpointType: 'URL'
    }
  }

  const ORACLE_AUD_EMAIL_URL_PAYLOAD = {
    isDefault: true,
    currency: 'AUD',
    oracleIdType: 'EMAIL',
    endpoint: {
      value: 'http://localhost:8444',
      endpointType: 'URL'
    }
  }

  describe('Create', () => {
    it('creates an oracle', async () => {
      const result = await Oracle.createOracle(ORACLE_AUD_MSISDN_URL_PAYLOAD, createHeaders, testSpan)
      expect(result).toBe(true)

      const oracleEndpointResult = await OracleModel.getOracleEndpointByType('MSISDN')
      const createdId = oracleEndpointResult[0].oracleEndpointId
      await Db.from('oracleEndpoint').destroy({ oracleEndpointId: createdId })
    })

    it('creates a similar oracle if the first is inactive', async () => {
      const result = await Oracle.createOracle(ORACLE_AUD_MSISDN_URL_PAYLOAD, createHeaders, testSpan)
      expect(result).toBe(true)

      // Delete/mark first oracle inactive
      const previousOracleResult = await OracleModel.getOracleEndpointByType('MSISDN')
      const firstOracleCreatedId = previousOracleResult[0].oracleEndpointId
      await Oracle.deleteOracle({ ID: firstOracleCreatedId })

      const secondResult = await Oracle.createOracle(ORACLE_AUD_MSISDN_URL_PAYLOAD, createHeaders, testSpan)
      expect(secondResult).toBe(true)

      const oracleEndpointResult = await OracleModel.getOracleEndpointByType('MSISDN')
      const activeCreatedId = oracleEndpointResult[0].oracleEndpointId
      await Db.from('oracleEndpoint').destroy({ oracleEndpointId: activeCreatedId })

      // Cleanup inactive endpoint for good measure
      await Db.from('oracleEndpoint').destroy({ oracleEndpointId: firstOracleCreatedId })
    })

    it('rejects creating a similar oracle when one is still active', async () => {
      const result = await Oracle.createOracle(ORACLE_AUD_MSISDN_URL_PAYLOAD, createHeaders, testSpan)
      expect(result).toBe(true)

      try {
        await Oracle.createOracle(ORACLE_AUD_MSISDN_URL_PAYLOAD, createHeaders, testSpan)
      } catch (error) {
        expect(error.message).toBe('Active oracle with matching partyIdTypeId, endpointTypeId, currencyId already exists')
      }

      const oracleEndpointResult = await OracleModel.getOracleEndpointByType('MSISDN')
      const createdId = oracleEndpointResult[0].oracleEndpointId
      await Db.from('oracleEndpoint').destroy({ oracleEndpointId: createdId })
    })
  })

  describe('Update', () => {
    it('updates an oracle', async () => {
      const createResult = await Oracle.createOracle(ORACLE_AUD_MSISDN_URL_PAYLOAD, createHeaders, testSpan)
      expect(createResult).toBe(true)

      // Get newly created oracle
      const oracleEndpointResult = await OracleModel.getOracleEndpointByType('MSISDN')
      const createdId = oracleEndpointResult[0].oracleEndpointId

      // Update the oracle's currency
      const updateResult = await Oracle.updateOracle(
        {
          ID: createdId,
        },
        {
          isDefault: true,
          currency: 'USD',
          oracleIdType: 'MSISDN',
          endpoint: {
            value: 'http://localhost:8444',
            endpointType: 'URL'
          }
        }
      )
      expect(updateResult).toBe(true)

      const updatedOracleEndpointResult = await OracleModel.getOracleEndpointByType('MSISDN')
      expect(updatedOracleEndpointResult[0].currency).toEqual('USD')

      // Cleanup
      const updatedId = updatedOracleEndpointResult[0].oracleEndpointId
      await Db.from('oracleEndpoint').destroy({ oracleEndpointId: updatedId })
    })

    it('updates an oracle even if there is a similar oracle that is inactive', async () => {
      const createResultAUD = await Oracle.createOracle(
        ORACLE_AUD_MSISDN_URL_PAYLOAD,
        createHeaders,
        testSpan
      )
      expect(createResultAUD).toBe(true)

      // Get newly created AUD currency oracle
      const oracleEndpointResultAUD = await OracleModel.getOracleEndpointByType('MSISDN')
      const createdIdAUD = oracleEndpointResultAUD[0].oracleEndpointId

      // Delete/mark first AUD currency oracle inactive
      await Oracle.deleteOracle({ ID: createdIdAUD })

      const payloadUSD = {
        isDefault: true,
        currency: 'USD',
        oracleIdType: 'MSISDN',
        endpoint: {
          value: 'http://localhost:8444',
          endpointType: 'URL'
        }
      }

      // Create USD currency oracle
      const createResultUSD = await Oracle.createOracle(payloadUSD, createHeaders, testSpan)
      expect(createResultUSD).toBe(true)

      // Get newly created USD currency oracle
      const oracleEndpointResultUSD = await OracleModel.getOracleEndpointByType('MSISDN')
      const createdIdUSD = oracleEndpointResultUSD[0].oracleEndpointId

      // Update the USD currency oracle to be AUD currency
      const updateResult = await Oracle.updateOracle(
        {
          ID: createdIdUSD,
        },
        {
          isDefault: true,
          currency: 'AUD',
          oracleIdType: 'MSISDN',
          endpoint: {
            value: 'http://localhost:8444',
            endpointType: 'URL'
          }
        }
      )

      // Assert true since previous AUD currency oracle was deleted
      expect(updateResult).toBe(true)

      // Cleanup
      const updatedOracleEndpointResult = await OracleModel.getOracleEndpointByType('MSISDN')
      expect(updatedOracleEndpointResult[0].currency).toEqual('AUD')

      const updatedId = updatedOracleEndpointResult[0].oracleEndpointId
      await Db.from('oracleEndpoint').destroy({ oracleEndpointId: updatedId })

      // Cleanup inactive model for good measure
      await Db.from('oracleEndpoint').destroy({ oracleEndpointId: createdIdAUD })
    })

    it('rejects updating an oracles currency if updating it would match an existing active oracle', async () => {
      const testSpan = EventSdk.Tracer.createSpan('createOracle service')
      const createResultAUD = await Oracle.createOracle(
        ORACLE_AUD_MSISDN_URL_PAYLOAD,
        createHeaders,
        testSpan
      )
      expect(createResultAUD).toBe(true)

      // Create USD currency oracle
      const createResultUSD = await Oracle.createOracle(
        ORACLE_USD_MSISDN_URL_PAYLOAD,
        createHeaders,
        testSpan
      )
      expect(createResultUSD).toBe(true)

      // Get newly created USD currency oracle
      const oracleEndpointResultUSD = await OracleModel.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD')
      const createdIdUSD = oracleEndpointResultUSD[0].oracleEndpointId

      // Update the USD currency oracle to be AUD currency
      try {
        await Oracle.updateOracle(
          {
            ID: createdIdUSD,
          },
          ORACLE_AUD_MSISDN_URL_PAYLOAD
        )
      } catch (error) {
        // Should throw error since there is an existing active oracle
        // with similar currency
        expect(error.message).toBe('Active oracle with matching partyIdTypeId, endpointTypeId, currencyId already exists')
      }

      // Cleanup
      const oracleEndpointResultMSISDNAUD = await OracleModel.getOracleEndpointByTypeAndCurrency('MSISDN', 'AUD')
      const oracleEndpointResultMSISDNUSD = await OracleModel.getOracleEndpointByTypeAndCurrency('MSISDN', 'USD')
      await Db.from('oracleEndpoint').destroy({
        oracleEndpointId: oracleEndpointResultMSISDNUSD[0].oracleEndpointId
      })
      await Db.from('oracleEndpoint').destroy({
        oracleEndpointId: oracleEndpointResultMSISDNAUD[0].oracleEndpointId
      })
    })

    it('rejects updating an oracles id type if updating it would match an existing active oracle', async () => {
      const testSpan = EventSdk.Tracer.createSpan('createOracle service')
      const createResultMSISDN = await Oracle.createOracle(
        ORACLE_AUD_MSISDN_URL_PAYLOAD,
        createHeaders,
        testSpan
      )
      expect(createResultMSISDN).toBe(true)

      // Create email id type oracle
      const createResultEMAIL = await Oracle.createOracle(
        ORACLE_AUD_EMAIL_URL_PAYLOAD,
        createHeaders,
        testSpan
      )
      expect(createResultEMAIL).toBe(true)

      // Get newly created email id type oracle
      const oracleEndpointResultEmail = await OracleModel.getOracleEndpointByTypeAndCurrency('EMAIL', 'AUD')
      const createdIdEmail = oracleEndpointResultEmail[0].oracleEndpointId

      // Update the email id type oracle to be MSISDN id type oracle
      try {
        await Oracle.updateOracle(
          {
            ID: createdIdEmail,
          },
          ORACLE_AUD_MSISDN_URL_PAYLOAD
        )
      } catch (error) {
        // Should throw error since there is an existing active oracle
        // with similar id type
        expect(error.message).toBe('Active oracle with matching partyIdTypeId, endpointTypeId, currencyId already exists')
      }

      // Cleanup
      const oracleEndpointResultMSISDNAUD = await OracleModel.getOracleEndpointByTypeAndCurrency('MSISDN', 'AUD')
      const oracleEndpointResultEMAILAUD = await OracleModel.getOracleEndpointByTypeAndCurrency('EMAIL', 'AUD')
      await Db.from('oracleEndpoint').destroy({
        oracleEndpointId: oracleEndpointResultMSISDNAUD[0].oracleEndpointId
      })
      await Db.from('oracleEndpoint').destroy({
        oracleEndpointId: oracleEndpointResultEMAILAUD[0].oracleEndpointId
      })
    })

    // Currently there is only one endpoint type, that being 'URL'.
    // Would need to add tests when more endpoints are added.
    it.todo('rejects updating an oracles endpoint type if updating it would match an existing active oracle')
  })
})
