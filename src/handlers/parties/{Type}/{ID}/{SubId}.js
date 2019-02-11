'use strict';

/**
 * Operations on /parties/{Type}/{ID}/{SubId}
 */
module.exports = {
    /**
     * summary: PartiesSubIdByTypeAndID
     * description: The HTTP request GET /parties/&lt;Type&gt;/&lt;ID&gt; (or GET /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to lookup information regarding the requested Party, defined by &lt;Type&gt;, &lt;ID&gt; and optionally &lt;SubId&gt; (for example, GET /parties/MSISDN/123456789, or GET /parties/BUSINESS/shoecompany/employee1).
     * parameters: Accept
     * produces: application/json
     * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
     */
    get: function PartiesSubIdByTypeAndID(request, h) {
        return h.response({ errorInformation: { errorCode: '501', errorDescription: 'Not implemented' } }).code(501);
    },
    /**
     * summary: PartiesSubIdByTypeAndID
     * description: The callback PUT /parties/&lt;Type&gt;/&lt;ID&gt; (or PUT /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the Party information lookup.
     * parameters: body, Content-Length
     * produces: application/json
     * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
     */
    put: function PartiesSubIdByTypeAndIDPut(request, h) {
        return h.response({ errorInformation: { errorCode: '501', errorDescription: 'Not implemented' } }).code(501);
    }
};
