/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const { Enum } = require('@mojaloop/central-services-shared')
const { TransformFacades } = require('../../lib')
const { API_TYPES } = require('../../constants')

const { FspEndpointTypes } = Enum.EndPoints
const { Headers } = Enum.Http

const getPartyCbType = (partySubId) => partySubId
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_GET
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_GET

const putPartyCbType = (partySubId) => partySubId
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT

const errorPartyCbType = (partySubId) => partySubId
  ? FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_SUB_ID_PUT_ERROR
  : FspEndpointTypes.FSPIOP_CALLBACK_URL_PARTIES_PUT_ERROR

const makePutPartiesErrorPayload = async (config, fspiopError, headers, params) => {
  const body = fspiopError.toApiErrorObject(config.ERROR_HANDLING)
  return config.API_TYPE === API_TYPES.iso20022
    ? (await TransformFacades.FSPIOP.parties.putError({ body, headers, params })).body
    : body
}

const alsRequestDto = (sourceId, params) => ({
  sourceId,
  type: params.Type,
  partyId: params.ID
})

const partiesRequestOptionsDto = (params) => ({
  partyIdType: params.Type,
  partyIdentifier: params.ID,
  ...(params.SubId && { partySubIdOrType: params.SubId })
})

const swapSourceDestinationHeaders = (headers) => {
  const {
    [Headers.FSPIOP.SOURCE]: source,
    [Headers.FSPIOP.DESTINATION]: destination,
    [Headers.FSPIOP.PROXY]: proxy,
    ...restHeaders
  } = headers
  return {
    ...restHeaders,
    [Headers.FSPIOP.SOURCE]: destination,
    [Headers.FSPIOP.DESTINATION]: source
  }
}

module.exports = {
  getPartyCbType,
  putPartyCbType,
  errorPartyCbType,
  makePutPartiesErrorPayload,
  alsRequestDto,
  partiesRequestOptionsDto,
  swapSourceDestinationHeaders
}
