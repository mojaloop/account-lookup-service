
const resultData = Symbol();

module.exports.Pathfinder = class MockPathfinder {
    constructor(config, { mnc = 612, mcc = 5, logger = () => {} } = {}) {
        this.config = config;
        this.logger = logger;
        this[resultData] = { mnc, mcc };
    }

    async connect() {}

    async query(partyId, timeoutMs = this.config.queryTimeoutMs) {
        console.log('Mock pathfinder returning', this[resultData], 'timeoutMs', timeoutMs);
        return this[resultData];
    }
};
