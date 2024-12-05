## mock-proxy

This is a simple mock proxy server that can be used to emulate 
`inter-scheme-proxy-adatper` functionality in integration tests

#### Routes
 - `GET /history` - returns and array of requests made to the proxy.
It's used to assert some tests scenarios
 - `DELETE /history` - cleans up history
 - `ALL /echo` - returns request method, body, headers for testing purposes. Inject also some additional headers
 - `GET /health` - Returns a JSON object indicating the health status of the server.
 - `GET /parties/:type/:id` - Handles requests for party information. Responds with a 202 status and the request headers modified for the hub callback.
 - `PUT /parties/:type/:id/error` - Handles error responses for party information. Responds with a 200 status and the request headers modified for the DFSP callback.
 - `GET /oracle*` - Returns a JSON object with an empty party list.

#### Usage in integration tests
 1. In _docker-compose.yml_ file there's a service `proxy` defined. Some env vars are passed using [./test/integration/.env](../../test/integration/.env) file.
 2. Before running tests, we onboard some participants, including `proxy`, using [./test/integration/prepareTestParticipants.js](../../test/integration/prepareTestParticipants.js) script.
 3. Run tests and validate `proxy` calls (using _/history_ endpoint) according test scenarios.


