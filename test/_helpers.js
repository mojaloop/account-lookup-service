
const { createServer, service } = require('../src/server');
const getPort = require('get-port')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const DefaultCentral = { ErrorHandler }

const nullLogger = ['error', 'debug', 'warn', 'silly', 'log', 'trace', 'info']
  .reduce((pv, method) => Object.assign(pv, { [method]: () => {} }), {})

const startTestAdminServer = (buildAppMocks = () => ({})) => startTestServer(service.ADMIN, buildAppMocks)
const startTestAPIServer = (buildAppMocks = () => ({})) => startTestServer(service.API, buildAppMocks)

const startTestServer = (service, buildAppMocks) => async t => {
  const appMockDefaults = { logger: nullLogger, Central: DefaultCentral }
  const appMocks = { ...appMockDefaults, ...buildAppMocks() }
  t.context.server = await createServer(await getPort(), service, appMocks)
  // The following code is looking for the Blipp plugin. It looks for the text of the listener
  // function that Blipp registers against the start event. If the text of that function matches
  // the regex here, it replaces the listener function to do nothing so it's not a nuisance during
  // the tests.
  // This was deemed to be easier than configuring the server create code to allow plugin
  // configuration- especially when the only intention is for testing.
  // Are your tests failing because of this code? It was deliberately written to fail
  // obviously if the conditions leading to its existence were no longer true.
  // - if you're not using Blipp any more, delete the following statement
  // - if the content of the Blipp .register function has changed, you may need to change the regex
  //   here, or delete or comment this line and put up with getting Blipped in your test output
  const listenerRegex = /const out = .*\n.*console\.log\(out\)/
  t.context.server.events._eventListeners.start.handlers.find(h => listenerRegex.test(h.listener))
    .listener = () => {};
  await t.context.server.start();
}

module.exports = {
  startTestAPIServer,
  startTestAdminServer,
  startTestServer
}
