const Server = require('../../../src/server')
const { HANDLER_TYPES } = require('../../../src/constants')

describe('Handlers Index', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Server, 'initializeHandlers').mockImplementation(() => { })
  })

  it('should start specified handlers in args', async () => {
    process.argv = ['node', 'index.js', 'handlers', '--timeout']
    require('../../../src/handlers/index')
    expect(Server.initializeHandlers).toHaveBeenCalledWith([HANDLER_TYPES.TIMEOUT])
  })

  it('should not start any handlers if none are specified', async () => {
    process.argv = ['node', 'index.js', 'handlers']
    require('../../../src/handlers/index')
    expect(Server.initializeHandlers).not.toHaveBeenCalled()
  })
})
