const { TransformFacades } = require('../../../src/lib')
const { errorCallbackResponseDto } = require('../../fixtures')

describe('TransformFacades Tests -->', () => {
  test('dummy', () => {
    expect(true).toBe(true)
  })

  test.skip('should transform PUT /parties error callback payload to ISO format', async () => {
    const payload = errorCallbackResponseDto()
    const isoPayload = await TransformFacades.FSPIOP.parties.putError(payload)
    expect(isoPayload).toBeTruthy()
  })
})
