const { TransformFacades } = require('../../../src/lib')
const { errorCallbackResponseDto, partiesCallHeadersDto } = require('../../fixtures')

describe('TransformFacades Tests -->', () => {
  test('should transform PUT /parties error callback payload to ISO format', async () => {
    const body = errorCallbackResponseDto()
    const headers = partiesCallHeadersDto()
    const isoPayload = await TransformFacades.FSPIOP.parties.putError({ body, headers })
    expect(isoPayload.body).toBeTruthy()
    expect(isoPayload.body.Assgnmt).toBeTruthy()
    expect(isoPayload.body.Assgnmt.Assgnr).toBeTruthy()
    expect(isoPayload.body.Assgnmt.Assgne).toBeTruthy()
    expect(isoPayload.body.Rpt).toBeTruthy()
  })
})
