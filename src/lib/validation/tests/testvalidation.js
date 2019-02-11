'use strict';

const chance = new require('chance')();
// TODO: this should be parametrised a bit more, and we should test a range of specific, and
// randomly-generated resources
const RESOURCE = 'parties';
const test = require('ava');
const support = require('./_support');
const fs = require('fs');
const path = require('path');

const saveToTempFile = (data, fname) => {
    const dirPath = fs.mkdtempSync('testfail');
    const fPath = path.join(dirPath, fname);
    fs.writeFileSync(fPath, data);
    return fPath;
};

const validAcceptHeaders = resource => [
    `application/vnd.interoperability.${resource}+json`,
    `application/vnd.interoperability.${resource}+json,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1.0`,
    `application/vnd.interoperability.${resource}+json;version=1.0,application/vnd.interoperability.${resource}+json;version=1.1`,
    `application/vnd.interoperability.${resource}+json;version=1.1`,
    `application/vnd.interoperability.${resource}+json;version=2.0`,
    `application/vnd.interoperability.${resource}+json;version=2.1`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=2.1`,
    `application/vnd.interoperability.${resource}+json;version=12`,
    `application/vnd.interoperability.${resource}+json;version=12.0`,
    `application/vnd.interoperability.${resource}+json;version=12.10`,
    `application/vnd.interoperability.${resource}+json;version=2.100`,
    `application/vnd.interoperability.${resource}+json;version=100.100`,
    `application/vnd.interoperability.${resource}+json;version=001.20`,
    `application/vnd.interoperability.${resource}+json;version=12.12,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json,application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112,application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json`
];

const invalidAcceptHeaders = resource => [
    'whatever',
    'application/vnd.interoperability.whatever+json;version=1, ',
    `application/vnd.interoperability.a${resource}+json;version=1, `,
    `application/vnd.interoperability.${resource}+json;version=1, `,
    `application/vnd.interoperability.${resource}+json;version=1, application/vnd.interoperability.${resource}+json;version=1`,
    ...validAcceptHeaders(resource).map(h => h.toUpperCase())
];

// Generate a "single accept version" regex
const S = resource => `application/vnd\\.interoperability\\.${resource}\\+json(;version=\\d+(\\.\\d+)?)?`;
// Generate an accept header regex
const R = resource => new RegExp(`^${S(resource)}(,${S(resource)})*$`);
// The actual regex for the resource we're testing
const acceptRes = R(RESOURCE);

test('Run positive accept test suite', t => {
    const positiveTestSuite = validAcceptHeaders(RESOURCE);
    const failures = positiveTestSuite.filter(h => null === h.match(acceptRes));
    if (failures.length !== 0) {
        return t.fail(`Positive test suite failed. Failures: \n\'${failures.join('\'\n\'')}.`);
    }
    t.pass();
});

test('Run negative accept test suite', t => {
    const negativeTestSuite = invalidAcceptHeaders(RESOURCE);
    const failures = negativeTestSuite.filter(h => null !== h.match(acceptRes));
    if (failures.length !== 0) {
        // return t.fail(`Negative test suite failed. Failures: ${failures}.`);
        return t.fail(`Negative test suite failed. Failures: \n\'${failures.join('\'\n\'')}.`);
    }
    t.pass();
});

test('Run negative accept fuzz', t => {
    // Removed a, A from chance's default string pool. This prevents a chance (the adjective, not
    // the noun) generation of a valid header. We could equally have removed any other letter in
    // the string '/.+abcdeijlnoprstvyABCDEIJLNOPRSTVY', containing each character in a valid
    // version header.
    const pool = 'bcdefghijklmnopqrstuvwxyzBCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()[]';
    const negativeFuzzTestSuite = Array.from({ length: 100000 }, () => chance.string({ pool }) + chance.string());
    const failures = negativeFuzzTestSuite.filter(h => null !== h.match(acceptRes));
    if (failures.length !== 0) {
        const fname = saveToTempFile('\'' + failures.join('\'\n\'') + '\'', 'negativefuzz');
        return t.fail(`Negative fuzz failed. Failures saved to: ${fname}.`);
    }
    t.pass();
});

test('Run positive accept fuzz', t => {
    const positiveFuzzTestSuite = Array.from({ length: 100000 },
        () => support.generateAcceptHeader(RESOURCE, support.generateAcceptVersions()));
    const failures = positiveFuzzTestSuite.filter(h => null === h.match(acceptRes));
    if (failures.length !== 0) {
        const fname = saveToTempFile('\'' + failures.join('\'\n\'') + '\'', 'positivefuzz');
        return t.fail(`Positive fuzz failed. Failures saved to: ${fname}.`);
    }
    t.pass();
});

const validContentTypeHeaders = resource => [
    `application/vnd.interoperability.${resource}+json;version=1.0`,
    `application/vnd.interoperability.${resource}+json;version=1.1`,
    `application/vnd.interoperability.${resource}+json;version=2.0`,
    `application/vnd.interoperability.${resource}+json;version=2.1`,
    `application/vnd.interoperability.${resource}+json;version=12.0`,
    `application/vnd.interoperability.${resource}+json;version=12.10`,
    `application/vnd.interoperability.${resource}+json;version=2.100`,
    `application/vnd.interoperability.${resource}+json;version=100.100`,
    `application/vnd.interoperability.${resource}+json;version=001.20`
];

const invalidContentTypeHeaders = resource => [
    `application/vnd.interoperability.${resource}+json`,
    `application/vnd.interoperability.${resource}+json,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1.0,application/vnd.interoperability.${resource}+json;version=1.1`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=2.1`,
    `application/vnd.interoperability.${resource}+json;version=12`,
    `application/vnd.interoperability.${resource}+json;version=12.12,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json,application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112,application/vnd.interoperability.${resource}+json;version=1`,
    `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112,application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json`
];

// The regex for the resource we're testing
const contentTypeRes = new RegExp(`^application/vnd\\.interoperability\\.${RESOURCE}\\+json;version=\\d+\\.\\d+$`);

test('Run positive content-type test suite', t => {
    const positiveTestSuite = validContentTypeHeaders(RESOURCE);
    const failures = positiveTestSuite.filter(h => null === h.match(contentTypeRes));
    if (failures.length !== 0) {
        return t.fail(`Positive test suite failed. Failures: \n\'${failures.join('\'\n\'')}.`);
    }
    t.pass();
});

test('Run negative content-type test suite', t => {
    const negativeTestSuite = invalidContentTypeHeaders(RESOURCE);
    const failures = negativeTestSuite.filter(h => null !== h.match(contentTypeRes));
    if (failures.length !== 0) {
        // return t.fail(`Negative test suite failed. Failures: ${failures}.`);
        return t.fail(`Negative test suite failed. Failures: \n\'${failures.join('\'\n\'')}.`);
    }
    t.pass();
});

test('Run negative content-type fuzz', t => {
    // Removed a, A from chance's default string pool. This prevents a chance (the adjective, not
    // the noun) generation of a valid header. We could equally have removed any other letter in
    // the string '/.+abcdeijlnoprstvyABCDEIJLNOPRSTVY', containing each character in a valid
    // version header.
    const pool = 'bcdefghijklmnopqrstuvwxyzBCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()[]';
    const negativeFuzzTestSuite = Array.from({ length: 100000 }, () => chance.string({ pool }) + chance.string());
    const failures = negativeFuzzTestSuite.filter(h => null !== h.match(contentTypeRes));
    if (failures.length !== 0) {
        const fname = saveToTempFile('\'' + failures.join('\'\n\'') + '\'', 'negativefuzz');
        return t.fail(`Negative fuzz failed. Failures saved to: ${fname}.`);
    }
    t.pass();
});

test('Run positive content-type fuzz', t => {
    const positiveFuzzTestSuite = Array.from({ length: 100000 },
        () => support.generateContentTypeHeader(RESOURCE, support.generateContentTypeVersion()));
    const failures = positiveFuzzTestSuite.filter(h => null === h.match(contentTypeRes));
    if (failures.length !== 0) {
        const fname = saveToTempFile('\'' + failures.join('\'\n\'') + '\'', 'positivefuzz');
        return t.fail(`Positive fuzz failed. Failures saved to: ${fname}.`);
    }
    t.pass();
});
