'use strict';

const defCbUrl = 'http://localhost:3001';

const defaultEpMap = e => (({ 1: defCbUrl, 'test participant': defCbUrl })[e]);
const defaultParticipantMap = () => 'test participant';

/**
 * Abstracts operations against the database
 */
class Database {
    // Takes
    //  - a function mapping inputs to endpoints for ids and names. e.g.
    //    e => ({ 1: 'localhost:5000', 'test participant': 'localhost:5000' })[e]
    //  - a function mapping mcc, mnc to test participant names
    //    (mcc, mnc) => 'test participant'
    // Note that 'test participant' was the string used in two places in the
    // above examples. This means if we return 'test participant' for an
    // (mnc,mcc) pair, subsequent endpoint lookups for 'test participant' will
    // return a useful value.
    constructor(config, {
        logger = () => {},
        endpointMap = defaultEpMap,
        testParticipantNameMap = defaultParticipantMap } = {}) {
        this.endpointMap = endpointMap;
        this.participantMap = testParticipantNameMap;
        this.logger = logger;
    }

    /**
     * Connects to the database and returns a self reference
     *
     * @returns {promise} - self-reference
     */
    async connect() {
        // async api means we won't need to refactor if we move to an async model internally
        this.logger('Mock db initialised');
        return this;
    }

    /**
     * async utility for getting a transaction object from knex
     *
     * @returns {undefined}
     */
    // TODO:
    // async newTransaction() {
    //     return util.promisify(this.queryBuilder.transaction.bind(this.queryBuilder))();
    // }
    async newTransaction() {
        return;
    }

    /**
     * Check whether the database connection has basic functionality
     *
     * @returns {boolean}
     */
    async isConnected() {
        return true;
    }

    /**
     * Gets the name of the participant specified by mobile country code and mobile network code
     *
     * @returns {promise} - name of the participant
     */
    async getParticipantNameFromMccMnc(mobileCountryCode, mobileNetworkCode) {
        return this.participantMap(mobileCountryCode, mobileNetworkCode);
        // return 'test participant';
    }

    /**
     * Gets the specified endpoint of the specified type for the specified participant by name
     *
     * @returns {promise} - resolves to the endpoint base url
     */
    async getParticipantEndpointByName(participantName) {
        return this.endpointMap(participantName);
        // return 'localhost';
    }
}


module.exports = Database;
