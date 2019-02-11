'use strict';

/**
 * Operations on /participants/{ID}/error
 */
module.exports = {
    /**
     * summary: ParticipantsByIDAndError
     * description: If there is an error during FSP information creation in the server, the error callback PUT /participants/&lt;ID&gt;/error is used. The &lt;ID&gt; in the URI should contain the requestId that was used for the creation of the participant information.
     * parameters: ID, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
     * produces: application/json
     * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
     */
    put: function ParticipantsByIDAndError(request, h) {
        return h.response({ errorInformation: { errorCode: '501', errorDescription: 'Not implemented' } }).code(501);
    }
};
