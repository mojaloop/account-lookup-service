const { API_TYPES } = require('@mojaloop/central-services-shared').Util.Hapi
const { timeoutCallbackDto } = require('../../../../src/domain/timeout/dto')
const config = require('../../../../src/lib/config')

const realApiType = config.API_TYPE

describe('timeoutCallbackDto Tests -->', () => {
  afterAll(() => {
    config.API_TYPE = realApiType
  })

  // todo: unskip after fixing transformLib SubId issue for parties.putError
  test.skip('should produce ISO payload', async () => {
    config.API_TYPE = API_TYPES.iso20022
    const destination = 'D1'
    const partyId = 'P1'
    const partyType = 'XXX'
    const dto = await timeoutCallbackDto({ destination, partyId, partyType })
    expect(dto.errorInformation).toBeTruthy()

    const { Assgnr, Assgne } = dto.errorInformation.Assgnmt
    expect(Assgnr.Agt.FinInstnId.Othr.Id).toBe(config.HUB_NAME)
    expect(Assgne.Agt.FinInstnId.Othr.Id).toBe(destination)
  })
})
