'use strict';

async function forwardRequest(requests, db, req, opts) {
    try {
        // Look up the callback base url
        const endpoint = await db.getParticipantEndpointByName(req.headers['fspiop-destination']);
        if (!endpoint) {
            throw new Error('Couldn\'t find endpoint for', req.headers['fspiop-destination']);
        }
        requests.queueResponse(requests.buildPath(endpoint, req.path), req.payload, requests.filterHeaders(req.headers), opts);
    }
    catch(err) {
        // TODO: Send the error to the requester
        throw ('stack' in err) ? err : new Error(err);
    }
}

module.exports = {
    forwardRequest
};
