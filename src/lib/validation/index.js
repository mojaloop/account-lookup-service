'use strict';

const anyVersion = require('./anyVersion');

const generateContentTypeRegex = resource =>
    new RegExp(`^application/vnd\\.interoperability\\.${resource}\\+json;version=(\\d+\\.\\d+)$`);

const generateAcceptRegex = resource =>
    new RegExp(`^${generateSingleAcceptRegexStr(resource)}(,${generateSingleAcceptRegexStr(resource)})*$`);

const generateSingleAcceptRegexStr = resource =>
    `application/vnd\\.interoperability\\.${resource}\\+json(;version=\\d+(\\.\\d+)?)?`;

const parseContentTypeHeader = (path, header) => {
    if (typeof header !== 'string') {
        throw new Error('Header type invalid');
    }

    // First, extract the resource type from the path
    const resource = path.replace(/^\//, '').split('/')[0];

    // Create the validation regex
    const r = generateContentTypeRegex(resource);

    // Test the header
    const match = header.match(r);
    if (match === null) {
        return { valid: false };
    }

    return {
        valid: true,
        resource,
        version: match[1]
    };
};

const parseAcceptHeader = (path, header) => {
    if (typeof header !== 'string') {
        throw new Error('Header type invalid');
    }

    // First, extract the resource type from the path
    const resource = path.replace(/^\//, '').split('/')[0];

    // Create the validation regex
    const r = generateAcceptRegex(resource);

    // Test the header
    if (header.match(r) === null) {
        return { valid: false };
    }

    // The header contains a comma-delimited set of versions, extract these
    const versions = new Set(header
        .split(',')
        .map(verStr => verStr.match(new RegExp(generateSingleAcceptRegexStr(resource)))[1])
        .map(match => match === undefined ? anyVersion : match.split('=')[1])
    );

    return {
        valid: true,
        resource,
        versions
    };
};

module.exports = {
    parseAcceptHeader,
    parseContentTypeHeader,
    anyVersion,
    test: require('./tests/_support')
};
