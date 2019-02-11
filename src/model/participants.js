'use strict';

const errors = require('@lib/error').responses.async;
const utils = require('./utils');

// TODO: comments
module.exports.handleMSISDNParticipantRequest = async function(
    { database: db, pathfinder: pf, requests, logger }, sourceParticipantName, req) {
    try {
        // Build the response
        logger('looking up participant:', sourceParticipantName);
        const endpoint = await db.getParticipantEndpointByName(sourceParticipantName);
        const url = requests.buildPath(endpoint, req.path);
        const headers = requests.defaultHeaders(sourceParticipantName, 'participants');

        // Mobile country code (mcc), mobile network code (mnc) together uniquely identify an mno
        const { mcc, mnc } = await pf.query(req.params.ID);

        if (mcc === undefined || mnc === undefined) {
            requests.queueResponse(requests.buildPath(url, 'error'), errors.msisdnNotFound, headers, { logger });
            return;
        }

        // Now map mno to fsp/party
        try {
            const targetParticipantName = await db.getParticipantNameFromMccMnc(mcc, mnc);
            // Send the fspId { fspId: 1234 }
            requests.queueResponse(url, { fspId: targetParticipantName }, headers, { logger });
        } catch (err) {
            if (null == err.message.match('Could not find participant')) {
                throw err;
            }
            requests.queueResponse(requests.buildPath(url, 'error'), errors.invalidFsp, headers, { logger });
        }
    }
    catch(err) {
        // TODO: Send the error to the requester
        throw ('stack' in err) ? err : new Error(err);
    }
};

// TODO: replace the call site with the inside of the function call?
module.exports.handleMSISDNParticipantErrorResponse = async function({ database: db, requests, logger }, req) {
    utils.forwardRequest(requests, db, req, { logger });
};
