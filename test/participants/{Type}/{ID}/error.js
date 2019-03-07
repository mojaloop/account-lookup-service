'use strict';

const test = require('ava');
const root = '../../../..';
const Mockgen = require(`${root}/data/mockgen.js`);
const Server = require(`${root}/server`);
const mockRequests = require(`${root}/data/mockrequests`);
const support = require(`${root}/tests/_support`);

test.beforeEach(support.beforeEach);

/**
 * Test for /participants/{Type}/{ID}/error
 */
/**
 * summary: ParticipantsErrorByTypeAndID
 * description: If the server is unable to find, create or delete the associated FSP of the provided identity, or another processing error occurred, the error callback PUT /participants/&lt;Type&gt;/&lt;ID&gt;/error (or PUT /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;/error) is used.
 * parameters: Type, ID, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
 * produces: application/json
 * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
 */
test('test ParticipantsErrorByTypeAndID put operation', async function (t) {
    const server = await Server.createServer(t.context);

    const requests = new Promise((resolve, reject) => {
        Mockgen().requests({
            path: '/participants/{Type}/{ID}/error',
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
        url: '/participants/MSISDN/12345/error' // mock.request.path
    };
    if (mock.request.body) {
        //Send the request body
        options.payload = mock.request.body;
    } else if (mock.request.formData) {
        //Send the request form data
        options.payload = mock.request.formData;
        //Set the Content-Type as application/x-www-form-urlencoded
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    // If headers are present, set the headers.
    if (mock.request.headers && mock.request.headers.length > 0) {
        options.headers = mock.request.headers;
    }

    options.headers['fspiop-destination'] = 'test participant';

    const response = await server.inject(options);

    t.is(response.statusCode, 202, 'Ok response status');
    t.is(mockRequests.getStatistics(t.context.requests).total, 1, 'Exactly one call to request lib');
    t.is(mockRequests.getStatistics(t.context.requests).queueResponse.length, 1, 'Request forwarded');

});
