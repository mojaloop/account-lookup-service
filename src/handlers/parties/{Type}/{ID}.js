'use strict';

const partiesModel = require('@model/model').parties;
const err = require('@lib/error');
//const AppError = err.ApplicationError;
const syncResponses = err.responses.build;
const asyncResponses = err.responses.async;
const pp = require('util').inspect;
const e164 = require('@lib/e164').validate;

/**
 * Operations on /parties/{Type}/{ID}
 */
module.exports = {
    /**
     * summary: PartiesByTypeAndID
     * description: The HTTP request GET /parties/&lt;Type&gt;/&lt;ID&gt; (or GET /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to lookup information regarding the requested Party, defined by &lt;Type&gt;, &lt;ID&gt; and optionally &lt;SubId&gt; (for example, GET /parties/MSISDN/123456789, or GET /parties/BUSINESS/shoecompany/employee1).
     * parameters: Accept
     * produces: application/json
     * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
     */
    get: function PartiesByTypeAndID(req, h) {
        // TODO: move the following two checks to the validation code
        if (req.params.Type !== 'MSISDN') {
            return syncResponses.badRequestMalformedType(h);
        }
        if (!e164(req.params.ID)) {
            return syncResponses.badRequestMalformedMSISDN(h);
        }
        // Deliberately ignoring the result, nor waiting for it
        (async function() {
            const metadata = `${req.method} ${req.path}`;
            const requesterName = req.headers['fspiop-source']; // should not fail; should have been validated already
            const { logger } = req.server.app;
            try {
                req.server.log(['info'], `received: ${metadata}. ${pp(req.params)}`);
                await partiesModel.handleMSISDNPartyRequest(req.server.app, req);
                req.server.log(['info'], `success: ${metadata}.`);
            }
            catch(err) {
                req.server.log(['error'], `ERROR - ${metadata}: ${err.stack || pp(err)}`);
                const { requests: rq, database: db } = req.server.app;
                const url = await rq.createErrorUrl(db, req.path, requesterName);
                // TODO: review this error message
                rq.sendError(url, asyncResponses.serverError, rq.defaultHeaders(requesterName, 'participants'), { logger });
            }
        })();
        return h.response().code(202);
    },

    /**
     * summary: PartiesByTypeAndID2
     * description: The callback PUT /parties/&lt;Type&gt;/&lt;ID&gt; (or PUT /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the Party information lookup.
     * parameters: body, Content-Length
     * produces: application/json
     * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
     */
    put: function PartiesByTypeAndID2(req, h) {
        // TODO: move the following two checks to the validation code
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
                await partiesModel.handleMSISDNPartyResponse(req.server.app, req);
                req.server.log(['info'], `success: ${metadata}.`);
            }
            catch(err) {
                req.server.log(['error'], `ERROR - ${metadata}: ${err.stack || pp(err)}`);
                const { requests: rq, database: db } = req.server.app;
                const url = await rq.createErrorUrl(db, req.path, requesterName);
                // TODO: review this error message
                rq.sendError(url, asyncResponses.serverError, rq.defaultHeaders(requesterName, 'participants'), { logger });
            }
        })();
        return h.response().code(200);
    }
};
