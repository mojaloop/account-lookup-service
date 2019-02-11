'use strict';

const test = require('ava');
const root = '../../..';
const Server = require(`${root}/server`);
const mockRequests = require(`${root}/data/mockrequests`);
const support = require(`${root}/tests/_support`);

test.beforeEach(support.beforeEach);

/**
 * Test for /participants/{ID}/error
 */
/**
 * summary: ParticipantsByIDAndError
 * description: If there is an error during FSP information creation in the server, the error callback PUT /participants/&lt;ID&gt;/error is used. The &lt;ID&gt; in the URI should contain the requestId that was used for the creation of the participant information.
 * parameters: ID, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
 * produces: application/json
 * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
 */
test('test ParticipantsByIDAndError put operation', async function (t) {
    const server = await Server.createServer(t.context);

    const options = {
        method: 'put',
        url: '/participants/12345/error',
        headers: { ...mockRequests.requestHeaders('participants'), 'FSPIOP-Destination': 'trash' },
        payload: { errorInformation: { errorCode: '1', errorDescription: 'Fake error' } }
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 501, '"Not implemented" response status');
    t.is(mockRequests.getStatistics(t.context.requests).total, 0, 'No calls to request lib');

});
