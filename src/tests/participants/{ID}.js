'use strict';

const test = require('ava');
const root = '../..';
const Mockgen = require(`${root}/data/mockgen.js`);
const Server = require(`${root}/server`);
const mockRequests = require(`${root}/data/mockrequests`);
const support = require(`${root}/tests/_support`);

test.beforeEach(support.beforeEach);

/**
 * Test for /participants/{ID}
 */
/**
 * summary: ParticipantsByID
 * description: The callback PUT /participants/&lt;ID&gt; is used to inform the client of the result of the creation of the provided list of identities.
 * parameters: ID, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
 * produces: application/json
 * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
 */
test('test ParticipantsByIDPut put operation', async function (t) {
    const server = await Server.createServer(t.context);

    const requests = new Promise((resolve, reject) => {
        Mockgen().requests({
            path: '/participants/{ID}',
            operation: 'put'
        }, function (error, mock) {
            return error ? reject(error) : resolve(mock);
        });
    });

    const mock = await requests;

    t.truthy(mock);
    t.truthy(mock.request);
    //Get the resolved path from mock request
    //Mock request Path templates({}) are resolved using path parameters
    const options = {
        method: 'put',
        headers: mockRequests.requestHeaders('participants'), // should these come from mockgen..??
        // TODO: test different lengths. Note that if we don't slice partyList
        // here we often (rightly) receive an HTTP 413 response because the
        // request is too large. So test the following:
        //  - is the maximum request size, as per the API spec, correctly enforced
        //  - the data generated here correctly matches the spec, implementation etc.
        payload: { currency: mock.request.body.currency, partyList: mock.request.body.partyList.slice(0, 100) },
        url: mock.request.path
    };
    // If headers are present, set the headers.
    if (mock.request.headers && mock.request.headers.length > 0) {
        options.headers = mock.request.headers;
    }

    const response = await server.inject(options);

    t.is(response.statusCode, 501, '"Not implemented" response status');
    t.is(mockRequests.getStatistics(t.context.requests).total, 0, 'No calls to request lib');

});
