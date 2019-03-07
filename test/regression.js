'use strict';

const test = require('ava');
const root = '..';
const Server = require(`${root}/server`);
const mockdb = require(`${root}/data/mockdb`);
const mockRequests = require(`${root}/data/mockrequests`);
const error = require('src/lib/error/error');
const makeErrPayload = error.responses.makePayload;
const Mockgen = require(`${root}/data/mockgen.js`);
const chance = new require('chance')();
const support = require(`${root}/tests/_support`);
const util = require('util');

const deleteHeader = (headers, header) => {
    // case-insensitively remove a given header.
    // 'headers should be a POJO with keys as headers
    //     e.g. { accept: 'whatever', 'content-type': 'blah'}
    // 'header should be a string with the header name
    //     e.g. 'content-type'
    Object.keys(headers).forEach(k => {
        if (null !== k.match(new RegExp(`^${header}$`, 'i'))) {
            delete headers[k];
        }
    });
    return headers;
};

test.beforeEach(support.beforeEach);

// CV0-2358
test('Empty parties accept header rejected correctly', async function (t) {
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/parties/MSISDN/1234567890',
        headers: deleteHeader(mockRequests.requestHeaders('parties'), 'accept')
    };

    const response = await server.inject(options);
    t.is(response.statusCode, 400, 'Request rejected');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestMissingAccept);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

// CV0-2358
test('Invalid parties accept header rejected correctly', async function (t) {
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/parties/MSISDN/1234567890',
        headers: t.context.requests.setHeaders(mockRequests.requestHeaders('parties'), {
            Accept: 'some trash'
        })
    };

    const response = await server.inject(options);
    t.is(response.statusCode, 400, 'Request rejected');
});

// CV0-2481
test('Database failure causes health-check to fail', async function (t) {
    t.context.db = {
        isConnected: () => false
    };
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/'
    };

    const response = await server.inject(options);
    t.is(response.payload, JSON.stringify({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Database not connected' }), 'Response payload indicates internal error');
    t.is(response.statusCode, 500, 'Response status indicates internal error');
});


// CV0-2481
test('Pathfinder failure causes health-check to fail', async function (t) {
    const errMsg = chance.string();
    t.context.pathfinder.query = async () => { throw new Error(errMsg); };
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/'
    };

    const response = await server.inject(options);
    t.is(response.payload, JSON.stringify({
        statusCode: 500,
        error: 'Internal Server Error',
        message: `Pathfinder module error: ${errMsg}` }), 'Response payload indicates internal error');
    t.is(response.statusCode, 500, 'Response status indicates internal error');
});

// CV0-2520
test('PUT parties/MSISDN/{msisdn}/error route returns a 200 instead of a 202', async function(t) {
    const server = await Server.createServer(t.context);

    const mg = Mockgen();
    const mock = await util.promisify(mg.requests.bind(mg))({
        path: '/parties/{Type}/{ID}/error',
        operation: 'put'
    });
    t.truthy(mock);
    t.truthy(mock.request);

    const options = {
        method: 'put',
        url: '/parties/MSISDN/12345/error',
        headers: { ...mockRequests.requestHeaders('parties'), 'fspiop-destination': 'test participant' },
        payload: mock.request.body
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 200, '"OK" response status');
});

// CV0-2520
test('PUT parties/MSISDN/{msisdn} route returns a 200 instead of a 202', async function(t) {
    const server = await Server.createServer(t.context);

    const mg = Mockgen();
    const mock = await util.promisify(mg.requests.bind(mg))({
        path: '/parties/{Type}/{ID}',
        operation: 'put'
    });
    t.truthy(mock);
    t.truthy(mock.request);

    const options = {
        method: 'put',
        url: '/parties/MSISDN/12345',
        headers: { ...mockRequests.requestHeaders('parties'), 'fspiop-destination': 'test participant' },
        payload: mock.request.body
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 200, '"OK" response status');
});

// CV0-2472, CV0-3158, CV0-3167, CV0-3172 get parties check non-whitelisted headers are not forwarded, date is not modified
test('Check only white-listed headers are forwarded, date is not modified', async function (t) {
    const participantName = chance.string();
    const endpoint = chance.url();
    t.context.db = new mockdb({}, {
        testParticipantNameMap: () => participantName,
        endpointMap: () => endpoint
    });
    const server = await Server.createServer(t.context);

    //Get the resolved path from mock request
    //Mock request Path templates({}) are resolved using path parameters
    const url = '/parties/MSISDN/12345';
    const trashHeaders = Array.from({ length: 10 }, () => chance.string());
    const options = {
        method: 'get',
        headers: {
            ...mockRequests.requestHeaders('parties'),
            'FSPIOP-Destination': 'blah blah blah',
            'FSPIOP-Signature': 'exactly what I specified before',
            'FSPIOP-HTTP-Method': 'this is the http method',
            'FSPIOP-URI': 'this is the uri',
            'X-Forwarded-For': 'any old nonsense',
            ...trashHeaders.reduce((pv, cv) => ({ ...pv, [cv]: chance.string() }), {})
        },
        url // mock.request.path
    };
    const testDate = options.headers['Date'];

    const response = await server.inject(options);

    const rqlib = t.context.requests;
    t.is(response.statusCode, 202, 'Ok response status');
    t.is(mockRequests.getStatistics(rqlib).total, 1, 'Exactly one call to request lib');
    t.is(mockRequests.getStatistics(rqlib).queueRequest.length, 1, 'Request forwarded');
    t.is(mockRequests.getStatistics(rqlib).queueRequest[0][0], `${endpoint}${url}`, 'Forwarded to correct address');
    t.is(mockRequests.getStatistics(rqlib).queueRequest[0][2]['fspiop-destination'], participantName, 'FSPIOP-Destination header correct');
    t.deepEqual(
        Object.keys(mockRequests.getStatistics(rqlib).queueRequest[0][2]).sort().map(e => e.toLowerCase()),
        rqlib.defaultHeaderWhitelist.sort().map(e => e.toLowerCase()),
        'Only whitelisted headers in forwarded request');
    t.is(testDate, mockRequests.getStatistics(rqlib).queueRequest[0][2]['date'], 'Date is unmodified on forwarded request');
});

// CV0-2471 fspiop destination is overwritten to correct value
test('Check fspiop destination is overwritten from switch', async function (t) {
    const participantName = chance.string();
    const endpoint = chance.url();
    t.context.db = new mockdb({}, {
        testParticipantNameMap: () => participantName,
        endpointMap: () => endpoint
    });
    const server = await Server.createServer(t.context);

    //Get the resolved path from mock request
    //Mock request Path templates({}) are resolved using path parameters
    const url = '/parties/MSISDN/12345';
    const rqlib = t.context.requests;
    const options = {
        method: 'get',
        headers: rqlib.setHeaders(mockRequests.requestHeaders('parties'), { 'FSPIOP-Destination': 'switch' }),
        url // mock.request.path
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 202, 'Ok response status');
    t.is(mockRequests.getStatistics(rqlib).total, 1, 'Exactly one call to request lib');
    t.is(mockRequests.getStatistics(rqlib).queueRequest.length, 1, 'Request forwarded');
    t.is(mockRequests.getStatistics(rqlib).queueRequest[0][0], `${endpoint}${url}`, 'Forwarded to correct address');
    t.is(mockRequests.getStatistics(rqlib).queueRequest[0][2]['fspiop-destination'], participantName, 'FSPIOP-Destination header correct');
});

// CV0-2471 fspiop destination is overwritten to correct value
test('Check fspiop destination is overwritten correctly', async function (t) {
    const participantName = chance.string();
    const endpoint = chance.url();
    t.context.db = new mockdb({}, {
        testParticipantNameMap: () => participantName,
        endpointMap: () => endpoint
    });
    const server = await Server.createServer(t.context);

    //Get the resolved path from mock request
    //Mock request Path templates({}) are resolved using path parameters
    const url = '/parties/MSISDN/12345';
    const options = {
        method: 'get',
        headers: { ...mockRequests.requestHeaders('parties'), 'FSPIOP-Destination': 'blah blah blah' },
        url // mock.request.path
    };

    const response = await server.inject(options);

    const rqlib = t.context.requests;
    t.is(response.statusCode, 202, 'Ok response status');
    t.is(mockRequests.getStatistics(rqlib).total, 1, 'Exactly one call to request lib');
    t.is(mockRequests.getStatistics(rqlib).queueRequest.length, 1, 'Request forwarded');
    t.is(mockRequests.getStatistics(rqlib).queueRequest[0][0], `${endpoint}${url}`, 'Forwarded to correct address');
    t.is(mockRequests.getStatistics(rqlib).queueRequest[0][2]['fspiop-destination'], participantName, 'FSPIOP-Destination header correct');
});

// CV0-2442
test('test party request for unmapped participant returns correct error', async function(t) {
    t.context.db = new mockdb({}, {
        testParticipantNameMap: (mcc, mnc) => { throw new Error(`Could not find participant with mcc, mnc: '${mcc}, ${mnc}'`); }
    });
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/parties/MSISDN/11',
        headers: mockRequests.requestHeaders('parties')
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 202, 'Ok response status');
    const expectedPayload = makeErrPayload(error.responses.asyncData.invalidFsp);
    const reqStats = mockRequests.getStatistics(t.context.requests);
    t.is(reqStats.total, 1, 'Exactly one call made to requests lib');
    const qrCalls = reqStats.queueResponse;
    t.is(qrCalls.length, 1, 'Exactly one call made to queueResponse');
    t.true(qrCalls[0][0].match(new RegExp(`${options.url}/error$`)) !== null, 'Response to appropriate error endpoint');
    t.deepEqual(qrCalls[0][1], expectedPayload, 'Correct error payload returned');
});

// CV0-2442
test('test request for unmapped participant returns correct error', async function(t) {
    t.context.db = new mockdb({}, {
        testParticipantNameMap: (mcc, mnc) => { throw new Error(`Could not find participant with mcc, mnc: '${mcc}, ${mnc}'`); }
    });
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/participants/MSISDN/11',
        headers: mockRequests.requestHeaders('participants')
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 202, 'Ok response status');
    const expectedPayload = makeErrPayload(error.responses.asyncData.invalidFsp);
    const reqStats = mockRequests.getStatistics(t.context.requests);
    t.is(reqStats.total, 1, 'Exactly one call made to requests lib');
    const qrCalls = reqStats.queueResponse;
    t.is(qrCalls.length, 1, 'Exactly one call made to queueResponse');
    t.true(qrCalls[0][0].match(new RegExp(`${options.url}/error$`)) !== null, 'Response to appropriate error endpoint');
    t.deepEqual(qrCalls[0][1], expectedPayload, 'Correct error payload returned');
});

// CV0-1187
test('test request with unsupported content type version fails', async function(t) {
    const server = await Server.createServer(t.context);

    const headers = {
        ...mockRequests.requestHeaders('participants'),
        'Content-Type': 'application/vnd.interoperability.participants+json;version=2.0'
    };

    const options = {
        method: 'get',
        url: '/participants/MSISDN/12345',
        headers
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, '"Bad request" response status');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestUnacceptableVersion);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

test('test request with unsupported content type fails', async function(t) {
    const server = await Server.createServer(t.context);

    const headers = {
        ...mockRequests.requestHeaders('participants'),
        'Content-Type': 'trash'
    };

    const options = {
        method: 'get',
        url: '/participants/MSISDN/12345',
        headers
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, '"Bad request" response status');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestMalformedContentType);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

// CV0-1816 lower-case msisdn fails
test('test participants lower-case "msisdn" in path fails', async function(t) {
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/participants/msisdn/12345',
        headers: mockRequests.requestHeaders('participants')
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, '"Bad request" response status');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestMalformedType);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

// CV0-1188
test('test participants non-msisdn type fails', async function(t) {
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/participants/blah/12345',
        headers: mockRequests.requestHeaders('participants')
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, '"Bad request" response status');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestMalformedType);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

// CV0-1189
test('test participants bad msisdn fails', async function(t) {
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/participants/MSISDN/@3456',
        headers: mockRequests.requestHeaders('participants')
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, '"Bad request" response status');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestMalformedMSISDN);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

// CV0-1452
test('test request with missing accept header version succeeds', async function(t) {
    const server = await Server.createServer(t.context);

    const headers = {
        ...mockRequests.requestHeaders('participants'),
        'accept': 'application/vnd.interoperability.participants+json'
    };

    const options = {
        method: 'get',
        url: '/participants/MSISDN/12345',
        headers
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 202, '"Bad request" response status');
});

// CV0-1190, CV0-1452
test('test request with unsupported accept header version fails', async function(t) {
    const server = await Server.createServer(t.context);

    const headers = {
        ...mockRequests.requestHeaders('participants'),
        'accept': 'application/vnd.interoperability.participants+json;version=150'
    };

    const options = {
        method: 'get',
        url: '/participants/MSISDN/12345',
        headers
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, '"Bad request" response status');
    const expectedPayload = {
        ...makeErrPayload(error.responses.syncData.badRequestUnacceptableVersion),
        extensionList: [ { key: '1', value: '0' } ]
    };
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

test('test request with unsupported accept header fails', async function(t) {
    const server = await Server.createServer(t.context);

    const headers = {
        ...mockRequests.requestHeaders('participants'),
        'accept': 'trash'
    };

    const options = {
        method: 'get',
        url: '/participants/MSISDN/12345',
        headers
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, '"Bad request" response status');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestMalformedAccept);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

// CV0-1454
test('test non-existent party msisdn returns appropriate error to requester', async function(t) {
    t.context.pathfinder.query = async () => ({}); // no mcc, mnc
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/parties/MSISDN/11',
        headers: mockRequests.requestHeaders('parties')
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 202, 'Ok response status');
    const expectedPayload = makeErrPayload(error.responses.asyncData.msisdnNotFound);
    const reqStats = mockRequests.getStatistics(t.context.requests);
    t.is(reqStats.total, 1, 'Exactly one call made to requests lib');
    const qrCalls = reqStats.queueResponse;
    t.is(qrCalls.length, 1, 'Exactly one call made to queueResponse');
    t.true(qrCalls[0][0].match(new RegExp(`${options.url}/error$`)) !== null, 'Response to appropriate error endpoint');
    t.deepEqual(qrCalls[0][1], expectedPayload, 'Correct error payload returned');
});

// CV0-1193, CV0-1454, CV0-1816
test('test non-existent participant msisdn returns appropriate error to requester', async function(t) {
    t.context.pathfinder.query = async () => ({}); // no mcc, mnc
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/participants/MSISDN/11',
        headers: mockRequests.requestHeaders('participants')
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 202, 'Ok response status');
    const expectedPayload = makeErrPayload(error.responses.asyncData.msisdnNotFound);
    const reqStats = mockRequests.getStatistics(t.context.requests);
    t.is(reqStats.total, 1, 'Exactly one call made to requests lib');
    const qrCalls = reqStats.queueResponse;
    t.is(qrCalls.length, 1, 'Exactly one call made to queueResponse');
    t.true(qrCalls[0][0].match(new RegExp(`${options.url}/error$`)) !== null, 'Response to appropriate error endpoint');
    t.deepEqual(qrCalls[0][1], expectedPayload, 'Correct error payload returned');
});

// CV0-1449
test('health check with minimal content returns 200', async function(t) {
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/'
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 200, 'Ok response status');
});

// CV0-1459
test('test parties put operation does not require accept header', async function (t) {
    const server = await Server.createServer(t.context);

    const mg = Mockgen();
    const mock = await util.promisify(mg.requests.bind(mg))({
        path: '/parties/{Type}/{ID}',
        operation: 'put'
    });

    let headers = deleteHeader(mockRequests.requestHeaders('parties'), 'accept');

    t.truthy(mock);
    t.truthy(mock.request);
    const options = {
        method: 'put',
        url: '/parties/MSISDN/12345',
        headers,
        payload: mock.request.body
    };

    options.headers['fspiop-destination'] = 'test participant';

    t.is(-1, Object.keys(options.headers).findIndex(h => h.match(/accept/i) !== null), 'Accept header not present on request');
    const response = await server.inject(options);

    t.is(response.statusCode, 200, 'Ok response status');
    const stats = mockRequests.getStatistics(t.context.requests);
    t.is(stats.total, 1, 'Exactly one call to request lib');
    t.is(stats.queueResponse.length, 1, 'Request forwarded');
    const resp = stats.queueResponse[0];
    t.deepEqual(resp[1], options.payload, 'Request body forwarded');
    t.true(resp[0].startsWith(t.context.db.endpointMap([options.headers['fspiop-destination']])), 'request forwarded to correct destination');
});

// CV0-1193, https://modusbox.atlassian.net/browse/CV0-1193?focusedCommentId=31943&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-31943
test('test invalid msisdn returns appropriate error to requester', async function(t) {
    t.context.pathfinder.query = async () => ({}); // no mcc, mnc
    const server = await Server.createServer(t.context);

    const options = {
        method: 'get',
        url: '/participants/MSISDN/00000000',
        headers: mockRequests.requestHeaders('participants')
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, 'Ok response status');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestMalformedMSISDN);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});

// CV0-1498
test('test parties get operation forwards upper-case MSISDN', async function (t) {
    const server = await Server.createServer(t.context);

    //Get the resolved path from mock request
    //Mock request Path templates({}) are resolved using path parameters
    const options = {
        method: 'get',
        headers: mockRequests.requestHeaders('parties'), // should these come from mockgen..??
        url: '/parties/MSISDN/12345' // mock.request.path
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 202, 'Ok response status');
    const rqStats = mockRequests.getStatistics(t.context.requests);
    t.false(rqStats.queueRequest[0][2]['content-type'] === undefined, 'Content-type forwarded');
    t.is(rqStats.queueRequest[0][2]['content-type'], options.headers['Content-Type'], 'Correct content-type forwarded');
    t.is(rqStats.total, 1, 'Exactly one call to request lib');
    t.is(rqStats.queueRequest.length, 1, 'Request forwarded');
});

// CV0-1498
test('test parties get operation forwards with correct content-type header', async function (t) {
    const server = await Server.createServer(t.context);

    //Get the resolved path from mock request
    //Mock request Path templates({}) are resolved using path parameters
    const options = {
        method: 'get',
        headers: mockRequests.requestHeaders('parties'), // should these come from mockgen..??
        url: '/parties/MSISDN/12345' // mock.request.path
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 202, 'Ok response status');
    const rqStats = mockRequests.getStatistics(t.context.requests);
    t.false(rqStats.queueRequest[0][2]['content-type'] === undefined, 'Content-type forwarded');
    t.is(rqStats.queueRequest[0][2]['content-type'], options.headers['Content-Type'], 'Correct content-type forwarded');
    t.is(rqStats.total, 1, 'Exactly one call to request lib');
    t.is(rqStats.queueRequest.length, 1, 'Request forwarded');
});

// CV0-1506
test('test request with missing content type fails correctly', async function(t) {
    const server = await Server.createServer(t.context);

    const headers = deleteHeader(mockRequests.requestHeaders('participants'), 'content-type');

    const options = {
        method: 'get',
        url: '/participants/MSISDN/12345',
        headers
    };

    const response = await server.inject(options);

    t.is(response.statusCode, 400, '"Bad request" response status');
    const expectedPayload = makeErrPayload(error.responses.syncData.badRequestMissingContentType);
    t.deepEqual(JSON.parse(response.payload), expectedPayload, 'Correct error payload returned');
});
