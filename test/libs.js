'use strict';

const test = require('ava');
const requests = require('src/lib/requests/requests');

test('Test setting multiple headers with different cases doesn\'t work', t => {
    const headers = {
        one: 'header',
        another: 'whatever'
    };
    const newHeaders = {
        ONE: 'HEADER',
        ANOTHER: 'value'
    };

    const afterSet = requests.setHeaders(headers, newHeaders);
    t.deepEqual(afterSet, { one: newHeaders.ONE, another: newHeaders.ANOTHER });

    const letsTryAgain = requests.setHeaders(newHeaders, {
        newheader: 'new-value',
        ONE: 'overwritten'
    });
    t.deepEqual(letsTryAgain, { ...newHeaders, newheader: 'new-value', ONE: 'overwritten' });

    const another = requests.setHeaders(
        requests.setHeaders(
            requests.setHeaders(
                headers,
                { one: 'two' }),
            { one: 'three' }),
        { ONE: 'four' });
    t.deepEqual(another, { ...headers, one: 'four' });
});

test('Test case mapping headers functionality', t => {
    const headers = {
        one: 'header',
        another: 'whatever'
    };
    t.deepEqual(requests.caseMapHeaders(headers), headers, 'Unmapped headers are not affected');
    const mappedHeaders = { ...headers, 'fspiop-destination': 'somewhatevervalue' };
    t.deepEqual(requests.caseMapHeaders(mappedHeaders), { ...headers, 'FSPIOP-Destination': 'somewhatevervalue' });
});
