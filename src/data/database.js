'use strict';

const util = require('util');
const Knex = require('knex');


/**
 * Abstracts operations against the database
 */
class Database {
    constructor(config, { logger = () => {} } = {}) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * Connects to the database and returns a self reference
     *
     * @returns {promise} - self-reference
     */
    async connect() {
        // async api means we won't need to refactor if we move to an async model internally
        this.queryBuilder = Knex(this.config);
        this.logger(`Connected to database with config: ${util.inspect(this.config)}`);
        return this;
    }


    /**
     * async utility for getting a transaction object from knex
     *
     * @returns {undefined}
     */
    async newTransaction() {
        return new Promise((resolve, reject) => {
            try {
                this.queryBuilder.transaction(txn => {
                    return resolve(txn);
                });
            }
            catch(err) {
                return reject(err);
            }
        });
    }


    /**
     * Check whether the database connection has basic functionality
     *
     * @returns {boolean}
     */
    async isConnected() {
        try {
            const result = await this.queryBuilder.raw('SELECT 1 + 1 AS result');
            if (result) {
                return true;
            }
            return false;
        } catch(err) {
            return false;
        }
    }


    /**
     * Gets the name of the participant specified by mobile country code and mobile network code
     *
     * @returns {promise} - name of the participant
     */
    // TODO: do we always just want the endpoint? Do we ever care about the id? Should this method
    // just take the mcc, mnc and return an endpoint?
    async getParticipantNameFromMccMnc(mobileCountryCode, mobileNetworkCode) {
        try {
            const rows = await this.queryBuilder('participantMno')
                .innerJoin('participant', 'participant.participantId', 'participantMno.participantId')
                .where({ mobileCountryCode, mobileNetworkCode })
                .select('participant.name');
            if ((!rows) || rows.length < 1) {
                // participant does not exist, this is an error
                throw new Error(`Could not find participant with mcc, mnc: '${mobileCountryCode}, ${mobileNetworkCode}'`);
            }
            return rows[0].name;
        }
        catch(err) {
            this.logger(`Error in getParticipantNameFromMccMnc: ${err.stack || util.inspect(err)}`);
            throw err;
        }
    }


    /**
     * Gets the specified endpoint of the specified type for the specified participant
     *
     * @returns {promise} - resolves to the endpoint base url
     */
    async getParticipantEndpointByName(participantName, endpointType = 'FSIOP_CALLBACK_URL') {
        try {
            const rows = await this.queryBuilder('participantEndpoint')
                .innerJoin('participant', 'participant.participantId', 'participantEndpoint.participantId')
                .innerJoin('endpointType', 'endpointType.endpointTypeId', 'participantEndpoint.endpointTypeId')
                .where('participant.name', participantName)
                .andWhere('endpointType.name', endpointType)
                .select('participantEndpoint.value');

            if((!rows) || rows.length < 1) {
                return null;
            }

            return rows[0].value;
        }
        catch(err) {
            this.logger(`Error in getParticipantEndpointByName: ${err.stack || util.inspect(err)}`);
            throw ('stack' in err) ? err : new Error(err);
        }
    }
}


module.exports = Database;
