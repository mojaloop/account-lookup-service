'use strict';

const test = require('ava');
const root = '../../../..';
const Mockgen = require(`${root}/data/mockgen.js`);
const Server = require(`${root}/server`);
const mockRequests = require(`${root}/data/mockrequests`);
const support = require(`${root}/tests/_support`);

test.beforeEach(support.beforeEach);

/**
 * Test for /parties/{Type}/{ID}/{SubId}
 */
/**
 * summary: PartiesSubIdByTypeAndID
 * description: The HTTP request GET /parties/&lt;Type&gt;/&lt;ID&gt; (or GET /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to lookup information regarding the requested Party, defined by &lt;Type&gt;, &lt;ID&gt; and optionally &lt;SubId&gt; (for example, GET /parties/MSISDN/123456789, or GET /parties/BUSINESS/shoecompany/employee1).
 * parameters: Accept
 * produces: application/json
 * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
 */
test('test PartiesSubIdByTypeAndID get operation', async function (t) {
    const server = await Server.createServer(t.context);

    const requests = new Promise((resolve, reject) => {
        Mockgen().requests({
            path: '/parties/{Type}/{ID}/{SubId}',
            operation: 'get'
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
        method: 'get',
        headers: mockRequests.requestHeaders('parties'), // should these come from mockgen..??
        url: mock.request.path
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

    const response = await server.inject(options);

    t.is(response.statusCode, 501, '"Not implemented" response status');
    t.is(mockRequests.getStatistics(t.context.requests).total, 0, 'No calls to request lib');

});
/**
 * summary: PartiesSubIdByTypeAndID
 * description: The callback PUT /parties/&lt;Type&gt;/&lt;ID&gt; (or PUT /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the Party information lookup.
 * parameters: body, Content-Length
 * produces: application/json
 * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
 */
test('test PartiesSubIdByTypeAndIDPut put operation', async function (t) {
    const server = await Server.createServer(t.context);

    const requests = new Promise((resolve, reject) => {
        Mockgen().requests({
            path: '/parties/{Type}/{ID}/{SubId}',
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
        headers: mockRequests.requestHeaders('parties'), // should these come from mockgen..??
        url: mock.request.path
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

    const response = await server.inject(options);

    t.is(response.statusCode, 501, '"Not implemented" response status');
    t.is(mockRequests.getStatistics(t.context.requests).total, 0, 'No calls to request lib');

});
