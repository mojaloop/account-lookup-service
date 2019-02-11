
const requests = require('@lib/requests');
const chance = new require('chance')();
const validation = require('@lib/validation');

const statsSymbol = Symbol('Mock request statistics');

function collectStats(fname, ...args) {
    this[statsSymbol][fname].push(args);
    ++this[statsSymbol].total;
}

class MockRequests {
    constructor() {
        // use a symbol to keep our interface clean and matching the normal
        // 'requests' interface to prevent super-confusing errors
        this[statsSymbol] = {
            queueRequest: [],
            queueResponse: [],
            forwardRequest: [],
            sendError: [],
            total: 0
        };
        this.caseMapHeaders = requests.caseMapHeaders,
        this.defaultHeaderWhitelist = requests.defaultHeaderWhitelist,
        this.filterHeaders = requests.filterHeaders,
        this.setHeaders = requests.setHeaders;
        this.createErrorUrl = requests.createErrorUrl;
        this.defaultHeaders = requests.defaultHeaders;
        this.augmentHeadersWithDefaults = requests.augmentHeadersWithDefaults;
        this.buildPath = requests.buildPath;
        this.queueRequest = collectStats.bind(this, 'queueRequest');
        this.queueResponse = collectStats.bind(this, 'queueResponse');
        this.sendError = collectStats.bind(this, 'sendError');
    }
}

const getStatistics = mockRequests => mockRequests[statsSymbol];

const acceptedVersions = ['1', '1.0', validation.anyVersion];
const randomAcceptedVersions = () => {
    const result = acceptedVersions.filter(() => Math.random() > (1 / 3));
    if (result.length > 0) {
        return result;
    }
    return [ acceptedVersions[Math.round(Math.random() * acceptedVersions.length)] ];
};
const requestHeaders = resource => ({
    'Accept': validation.test.generateAcceptHeader(resource, randomAcceptedVersions()),
    'Content-Type': `application/vnd.interoperability.${resource}+json;version=1.0`,
    'Date': chance.date().toISOString(),
    'FSPIOP-Source': 'test participant'
});

module.exports = {
    requestHeaders,
    getStatistics,
    MockRequests
};
