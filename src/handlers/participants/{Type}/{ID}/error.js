'use strict';

const model = require('../../../../model').participants;
const err = require('../../../../lib/error/error');
//const AppError = err.ApplicationError;
const syncResponses = err.responses.build;
const asyncResponses = err.responses.async;
const pp = require('util').inspect;
const e164 = require('../../../../lib/validation').e164Validate;

/**
 * Operations on /participants/{Type}/{ID}/error
 */
module.exports = {
    /**
     * summary: ParticipantsErrorByTypeAndID
     * description: If the server is unable to find, create or delete the associated FSP of the provided identity, or another processing error occurred, the error callback PUT /participants/&lt;Type&gt;/&lt;ID&gt;/error (or PUT /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;/error) is used.
     * parameters: Type, ID, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
     * produces: application/json
     * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
     */
    put: function ParticipantsErrorByTypeAndID(req, h) {
        if (req.params.Type !== 'MSISDN') {
            return syncResponses.badRequestMalformedType(h);
        }
        if (!e164(req.params.ID)) {
            return syncResponses.badRequestMalformedMSISDN(h);
        }
        (async function() {
            const metadata = `${req.method} ${req.path}`;
            const requesterName = req.headers['fspiop-source']; // should not fail; should have been validated already
            const { logger } = req.server.app;
            try {
                req.server.log(['info'], `received: ${metadata}. ${pp(req.params)}`);
                await model.handleMSISDNParticipantErrorResponse(req.server.app, req);
                req.server.log(['info'], `success: ${metadata}.`);
            }
            catch(err) {
                req.server.log(['error'], `ERROR - ${metadata}: ${err.stack || pp(err)}`);
                const { requests: rq, database: db } = req.server.app.requests;
                const url = await rq.createErrorUrl(db, req.path, requesterName);
                // TODO: review this error message
                rq.sendError(url, asyncResponses.serverError, rq.defaultHeaders(requesterName, 'participants'), { logger });
            }
        })();
        return h.response().code(202);
    }
};
