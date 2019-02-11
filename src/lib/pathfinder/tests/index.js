'use strict';

// NOTE: any test that hits the pathfinder CTE should be considered for serialising. At the time of
// writing, all are.

// TODO:
// - test module crashes fatally upon failed reconnect
const test = require('ava');
const Config = require('../config');
const _conf = new Config();
const Pathfinder = require('../');
const mockSocket = require('../mocksocket');
const Chance = require('chance');
const dnsPacket = require('dns-packet');
const opts = { logger: console.log.bind(console) };

// TODO: considering the following note, tests using known good responses, and known bad responses
// should probably be updated. Perhaps just to perform a more nuanced check on the result of the
// pathfinder query. For example, checking that when the aa (authoritative answer) flag is set in
// the response, we get an mcc and mnc in the response.
// Note: at the time of writing these tests Neustar support was contacted for known good queries,
// and known bad queries. Their response contained a set of numbers identified as known good, and a
// set identified as known bad. When tested, numbers from the 'known good' set turned out to be bad,
// and vice versa. I decided to ignore this and assume that the data changed frequently enough that
// it couldn't be relied on.
const knownGoodResponses = {
    // Authors phone numbers, and Orange, MTN test numbers
    '22507008181':  dnsPacket.streamDecode(Buffer.from('00c760b784000001000100020001013101380131013801300130013701300135013201320865313634656e756d036e65740000230001c00c00230001000003840048000a003201750c4532552b7073746e3a74656c33215e282e2a29242174656c3a5c313b73706e3d32333538303b6d63633d3631323b6d6e633d30333b715f737461743d3130392100c0180002000100000384000e036e7332036e6574046770727300c0180002000100000384000e036e7331036e65740467707273000000291400000000000000', 'hex')),
    '22504004762':  dnsPacket.streamDecode(Buffer.from('00c722a984000001000100020001013201360137013401300130013401300135013201320865313634656e756d036e65740000230001c00c00230001000003840048000a003201750c4532552b7073746e3a74656c33215e282e2a29242174656c3a5c313b73706e3d33373839353b6d63633d3631323b6d6e633d30353b715f737461743d3130392100c0180002000100000384000e036e7332036e6574046770727300c0180002000100000384000e036e7331036e65740467707273000000291400000000000000', 'hex')),
    '447455888660': dnsPacket.streamDecode(Buffer.from('00c9eeba840000010001000200010130013601360138013801380135013501340137013401340865313634656e756d036e65740000230001c00c00230001000003840048000a003201750c4532552b7073746e3a74656c33215e282e2a29242174656c3a5c313b73706e3d31353838383b6d63633d3233343b6d6e633d32303b715f737461743d3131322100c0160002000100000384000e036e7332036e6574046770727300c0160002000100000384000e036e7331036e65740467707273000000291400000000000000', 'hex')),
    '447710066017': dnsPacket.streamDecode(Buffer.from('00c97a61840000010001000200010137013101300136013601300130013101370137013401340865313634656e756d036e65740000230001c00c00230001000003840048000a003201750c4532552b7073746e3a74656c33215e282e2a29242174656c3a5c313b73706e3d34383334383b6d63633d3233343b6d6e633d30323b715f737461743d3131322100c0160002000100000384000e036e7332036e6574046770727300c0160002000100000384000e036e7331036e65740467707273000000291400000000000000', 'hex')),
    // Numbers from Neustar
    '14044560000':  dnsPacket.streamDecode(Buffer.from('007a477a80000001000100000001013001310130013101340130013401380137013501310865313634656e756d036e65740000230001c00c0023000100000384002f000a003201750c4532552b7073746e3a74656c1a215e282e2a29242174656c3a5c313b715f737461743d31303321000000291400000000000000')),
    '14042186358':  dnsPacket.streamDecode(Buffer.from('00dee48984000001000100010001013001300130013001360135013401340130013401310865313634656e756d036e65740000230001c00c0023000100000384004e000a003201750c4532552b7073746e3a74656c39215e282e2a29242174656c3a5c313b6e7064693b73706e3d32363536393b6d63633d3331303b6d6e633d3031323b715f737461743d3030322100c00c00060001000003840039036e7331036e65740467707273000561646d696e036e7331076e6575737461720362697a00776496600001518000001c200036ee800002a3000000291400000000000000')),
    '17062060133':  dnsPacket.streamDecode(Buffer.from('00cd0e8a84000001000100020001013901350132013601380131013201340130013401310865313634656e756d036e65740000230001c00c0023000100000384004e000a003201750c4532552b7073746e3a74656c39215e282e2a29242174656c3a5c313b6e7064693b73706e3d32323039323b6d63633d3331303b6d6e633d3135303b715f737461743d3030312100c0140002000100000384000e036e7332036e6574046770727300c0140002000100000384000e036e7331036e65740467707273000000291400000000000000')),
    '14042186259':  dnsPacket.streamDecode(Buffer.from('00dc03e684000001000100010001013101370137013401350136013701330137013701310865313634656e756d036e65740000230001c00c0023000100000384004c000a003201750c4532552b7073746e3a74656c37215e282e2a29242174656c3a5c313b6e7064693b73706e3d34333235363b616c745f73706e3d36363534393b715f737461743d3030312100c00c00060001000003840039036e7331036e65740467707273000561646d696e036e7331076e6575737461720362697a00776496600001518000001c200036ee800002a3000000291400000000000000')),
    '14042728246':  dnsPacket.streamDecode(Buffer.from('00cecf1884000001000100010001013001350137013501340133013401310137013501310865313634656e756d036e65740000230001c00c0023000100000384003e000a003201750c4532552b7073746e3a74656c29215e282e2a29242174656c3a5c313b6e7064693b73706e3d35313538393b715f737461743d3030322100c00c00060001000003840039036e7331036e65740467707273000561646d696e036e7331076e6575737461720362697a00776496600001518000001c200036ee800002a3000000291400000000000000')),
    '16786628313':  dnsPacket.streamDecode(Buffer.from('00deb3bf84000001000100010001013301310133013801320136013601380137013601310865313634656e756d036e65740000230001c00c0023000100000384004e000a003201750c4532552b7073746e3a74656c39215e282e2a29242174656c3a5c313b6e7064693b73706e3d34303635343b6d63633d3331303b6d6e633d3136303b715f737461743d3030322100c00c00060001000003840039036e7331036e65740467707273000561646d696e036e7331076e6575737461720362697a00776496600001518000001c200036ee800002a3000000291400000000000000')),
    '552177824301': dnsPacket.streamDecode(Buffer.from('00ce171584000001000100010001013101320133013201370133013501300137013701310865313634656e756d036e65740000230001c00c0023000100000384003e000a003201750c4532552b7073746e3a74656c29215e282e2a29242174656c3a5c313b6e7064693b73706e3d35363930313b715f737461743d3030322100c00c00060001000003840039036e7331036e65740467707273000561646d696e036e7331076e6575737461720362697a00776496600001518000001c200036ee800002a3000000291400000000000000')),
    '12012048415':  dnsPacket.streamDecode(Buffer.from('00c8f58684000001000100020001013501310134013801340130013201310130013201310865313634656e756d036e65740000230001c00c00230001000003840049000a003201750c4532552b7073746e3a74656c34215e282e2a29242174656c3a5c313b73706e3d34303635343b6d63633d3331303b6d6e633d3136303b715f737461743d3131332100c0120002000100000384000e036e7332036e6574046770727300c0120002000100000384000e036e7331036e65740467707273000000291400000000000000')),
    '12012046732':  dnsPacket.streamDecode(Buffer.from('00c8e85984000001000100020001013201330137013601340130013201310130013201310865313634656e756d036e65740000230001c00c00230001000003840049000a003201750c4532552b7073746e3a74656c34215e282e2a29242174656c3a5c313b73706e3d34373930353b6d63633d3331303b6d6e633d3132303b715f737461743d3131332100c0120002000100000384000e036e7332036e6574046770727300c0120002000100000384000e036e7331036e65740467707273000000291400000000000000')),
    '19414685653':  dnsPacket.streamDecode(Buffer.from('00cd1a0784000001000100020001013301350136013501380136013401310134013901310865313634656e756d036e65740000230001c00c0023000100000384004e000a003201750c4532552b7073746e3a74656c39215e282e2a29242174656c3a5c313b6e7064693b73706e3d32363536393b6d63633d3331303b6d6e633d3031323b715f737461743d3030312100c0140002000100000384000e036e7332036e6574046770727300c0140002000100000384000e036e7331036e65740467707273000000291400000000000000'))
};
const knownGoodNumbers = Object.keys(knownGoodResponses);

function getResponseFromWriteBuf(buf) {
    const request = dnsPacket.streamDecode(buf);
    const requestNum = request.questions[0].name.split('.').reverse().slice(2).join('');
    return dnsPacket.streamEncode({ ...knownGoodResponses[requestNum], id: request.id });
}

async function setup({ connectFunc = undefined, conf = new Config() } = {}) {
    conf.tls.rejectUnauthorized = _conf.env === 'live';
    const pf = new Pathfinder(conf, opts);
    await pf.connect(connectFunc);
    return pf;
}

test.serial('Test positive pathfinder sandbox query functional', async function(t) {
    // given
    const pf = await setup();

    // when
    const results = await Promise.all(knownGoodNumbers.map(el => pf.query(el)));

    // then
    results.forEach(r => {
        t.not(r.mnc, undefined, 'result contains mobile network code field');
        t.not(r.mcc, undefined, 'result contains mobile country code field');
    });
});

test.serial('Test negative pathfinder sandbox query functional', async function(t) {
    // given
    const knownBadNumbers = [
        '355456567567',
        '50945454545',
        '1650555010',
        '35555687678',
        '13055552444',
        '15784042020',
        '18744100215',
        '15784041010',
        '12482821111',
        '12162744004',
        '12162744003',
        '15714345750',
        '17737654771',
        '14795538218',
        '16788271794',
        '17705742609',
        '17705372321',
        '12177824301'
    ];
    const pf = await setup();

    // when
    const results = await Promise.all(knownBadNumbers.map(n => pf.query(n)));

    // then
    results.forEach(r => {
        // TODO: we could possibly also check whether the result contains the AA (authoritative
        // answer) field.
        t.is(r.mnc, undefined, 'result does not contain mobile network code field');
        t.is(r.mcc, undefined, 'result does not contain mobile country code field');
    });
    t.pass();
});

test('Test pathfinder socket error during operation causes reconnect attempt', async function(t) {
    // given
    const { socket, connectFunc } = mockSocket.createSocket(opts);
    const pf = await setup({ connectFunc });
    pf.query(knownGoodNumbers[0]);
    t.is(socket.destroyCallCount, 0, 'Expect socket to not have been destroyed before error occurs');

    // when
    socket.emit('error', new Error('Test error'));

    // then
    t.true(socket.destroyCallCount > 0, 'Expect socket to have been destroyed on pathfinder timeout');
});

test('Test pathfinder timeout causes reconnect attempt', async function(t) {
    // given
    // Here we simulate timeout by having our mock socket never emit a 'data' event
    const { socket, connectFunc } = mockSocket.createSocket(opts);
    t.is(socket.destroyCallCount, 0, 'Expect socket to not have been destroyed before test runs');
    const conf = new Config();
    conf.tls.rejectUnauthorized = _conf.env === 'live';
    conf.pathfinderTimeoutMs = 1;
    // Make this quite a bit bigger than pathfinder timeout, otherwise it might get called before
    // the pathfinder timeout is hit. This does raise the question:
    // TODO: test that all timeouts are cleared when any timeout occurs.
    // I.e., if the query timeout is called, it should clear the pathfinder timeout, and vice versa
    conf.queryTimeoutMs = 10000;
    const pf = new Pathfinder(conf, opts);
    await pf.connect(connectFunc);

    // when
    try {
        await pf.query(knownGoodNumbers[0]);
    } catch(err) {
        // ignore
    }

    // then
    t.true(socket.destroyCallCount > 0, 'Expect socket to have been destroyed on pathfinder timeout');
});

// pass
test('Test queries are not rejected before the queue limit is reached', async function(t) {
    // given
    const { connectFunc } = mockSocket.createSocket({
        ...opts,
        writeCb: (sock, buf) => sock.emit('data', getResponseFromWriteBuf(buf))
    });
    const conf = new Config();
    // TODO: Parametrise some of this stuff with jsverify
    // TODO: maxQueueLength is limited to 5 numbers because this test was not consistently running
    // to completion when run in parallel with the other tests. Another way to make it successfully
    // run to completion was to make it serial. However, the root cause of this failure was never
    // analysed. Changing the following line to: `const maxQueueLength = knownGoodNumbers.length`
    // and running all the tests should reproduce the problem.
    const maxQueueLength = Math.min(5, knownGoodNumbers.length);
    const numQueries = maxQueueLength;
    const numbers = knownGoodNumbers.slice(0, numQueries);
    conf.maxQueriesPerSecond = 4;
    conf.queryTimeoutMs = Math.round(1000 / conf.maxQueriesPerSecond) * maxQueueLength;
    const pf = await setup({ conf, connectFunc });

    // when
    const resultsP = Promise.all(numbers.map(el => pf.query(el)));

    //then
    await t.notThrowsAsync(resultsP, 'No error occurs');
});

//pass
test('Test queries are rejected when the queue is full', async function(t) {
    // given
    const { socket, connectFunc } = mockSocket.createSocket(opts);
    socket.write = buf => socket.emit('data', getResponseFromWriteBuf(buf));
    const conf = new Config();
    // TODO: Parametrise some of this stuff with jsverify
    const maxQueueLength = knownGoodNumbers.length - 1;
    const numQueries = maxQueueLength;
    const numbers = knownGoodNumbers.slice(0, numQueries + 1);
    conf.maxQueriesPerSecond = 4;
    conf.queryTimeoutMs = Math.round(1000 / conf.maxQueriesPerSecond) * maxQueueLength;
    const pf = await setup({ conf, connectFunc });

    // when
    const resultsP = Promise.all(numbers.map(el => pf.query(el)));

    // then
    const errMsg = `${maxQueueLength} messages queued. ` +
        `Handling ${conf.maxQueriesPerSecond} per second. ` +
        `Minimum queue processing duration ${conf.queryTimeoutMs}ms. ` +
        `Message timeout ${conf.queryTimeoutMs}ms. ` +
        'Service at capacity, message could not succeed.';
    await t.throwsAsync(resultsP, errMsg);
});

// Note that this test is run serially to prevent timeouts induced by other tests
const _test = new Config().env === 'live' ? test.skip : test;
_test('Test the module can sustain the minimum query rate', async function(t) {
    // given
    // We're expecting 14 transactions per second, so we'll test for 30 pathfinder queries per
    // second, for now.
    const chance = new Chance();
    let conf = new Config();
    conf.maxQueriesPerSecond = 30;
    conf.queryTimeoutMs = 2000;
    const pf = await setup({ conf });

    const opts = { mobile: true, formatted: false };
    const prefix = { fr: '33', uk: '44', za: '27' };

    // when
    const numbers = ['fr','uk','za']
        .reduce((arr, c) => arr.concat(Array(5).fill(c)), [])
        .map(c => ({
            prefix: prefix[c],
            num: chance.phone({ country: c, ...opts }).replace(/^0/, '')
        }));

    // then
    await t.notThrowsAsync(Promise.all(numbers.map(n => pf.query(n.prefix + n.num))));
});

test.serial('Test a set of random numbers, test returned country code is correct', async function(t) {
    // given
    const chance = new Chance();
    const pf = await setup();
    // Chance documentation is not caught up with chance source code. At the time of writing chance
    // phone supports mobile for 'uk', 'za', 'fr'. In GH master, 'br' is also supported, but this
    // doesn't appear to have been published to npm.
    const mccMap = { '33': '208', '44': '234', '27': '655'};
    const opts = { mobile: true, formatted: false };
    const prefix = { fr: '33', uk: '44', za: '27' };
    const numbers = ['fr','uk','za']
        .reduce((arr, c) => arr.concat(Array(20).fill(c)), [])
        .map(c => ({ prefix: prefix[c], num: chance.phone({ country: c, ...opts }).replace(/^0/, '') }));

    // when
    const results = await Promise.all(numbers.map(n => pf.query(n.prefix + n.num)));

    // then
    results.forEach((r, i) => {
        t.not(r, undefined, `Expect result received for ${numbers[i]}`);
        if (r.mcc) {
            const mcc = mccMap[numbers[i].prefix];
            t.is(r.mcc, mcc, `Expect ${numbers[i]} to have mobile country code ${mcc}`);
        }
    });
});
