'use strict';

/**
 * Operations on /parties/{Type}/{ID}/{SubId}/error
 */
module.exports = {
    /**
     * summary: PartiesSubIdErrorByTypeAndID
     * description: If the server is unable to find Party information of the provided identity, or another processing error occurred, the error callback PUT /parties/&lt;Type&gt;/&lt;ID&gt;/error (or PUT /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;/error) is used.
     * parameters: Type, ID, SubId, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
     * produces: application/json
     * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
     */
    put: function PartiesSubIdErrorByTypeAndID(request, h) {
        return h.response({ errorInformation: { errorCode: '501', errorDescription: 'Not implemented' } }).code(501);
    }
};
