'use strict';

const participants = require('../../../domain/participant')
const Logger = require('@mojaloop/central-services-shared').Logger

/**
 * Operations on /participants/{Type}/{ID}
 */
module.exports = {
    /**
     * summary: ParticipantsByTypeAndID
     * description: The HTTP request GET /participants/&lt;Type&gt;/&lt;ID&gt; (or GET /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to find out in which FSP the requested Party, defined by &lt;Type&gt;, &lt;ID&gt; and optionally &lt;SubId&gt;, is located (for example, GET /participants/MSISDN/123456789, or GET /participants/BUSINESS/shoecompany/employee1). This HTTP request should support a query string for filtering of currency. To use filtering of currency, the HTTP request GET /participants/&lt;Type&gt;/&lt;ID&gt;?currency=XYZ should be used, where XYZ is the requested currency.
     * parameters: Accept
     * produces: application/json
     * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
     */
    get: function ParticipantsByTypeAndID(req, h) {
        (async function() {
            const metadata = `${req.method} ${req.path}`
            const requesterName = req.headers['fspiop-source']
            try {
                Logger.info(`received: ${metadata}. ${req.params}`)
                await participants.participantsByTypeAndID(requesterName, req)
                Logger.info(`success: ${metadata}.`)
            }
            catch(err) {
                Logger.error(`ERROR - ${metadata}: ${err.stack || pp(err)}`)
                // TODO: what if this fails? We need to log. What happens by default?
                // TODO: review this error message
            }
        })();
        return h.response().code(202)
    },
    /**
     * summary: ParticipantsByTypeAndID
     * description: The callback PUT /participants/&lt;Type&gt;/&lt;ID&gt; (or PUT /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the lookup, creation, or deletion of the FSP information related to the Party. If the FSP information is deleted, the fspId element should be empty; otherwise the element should include the FSP information for the Party.
     * parameters: body, Content-Length
     * produces: application/json
     * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
     */
    put: function ParticipantsByTypeAndID3(request, h) {
        return h.response({ errorInformation: { errorCode: '501', errorDescription: 'Not implemented' } }).code(501)
    },
    /**
     * summary: ParticipantsByIDAndType
     * description: The HTTP request POST /participants/&lt;Type&gt;/&lt;ID&gt; (or POST /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to create information in the server regarding the provided identity, defined by &lt;Type&gt;, &lt;ID&gt;, and optionally &lt;SubId&gt; (for example, POST /participants/MSISDN/123456789 or POST /participants/BUSINESS/shoecompany/employee1).
     * parameters: body, Accept, Content-Length
     * produces: application/json
     * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
     */
    post: function ParticipantsByIDAndType(request, h) {
        return h.response({ errorInformation: { errorCode: '501', errorDescription: 'Not implemented' } }).code(501)
    },
    /**
     * summary: ParticipantsByTypeAndID
     * description: The HTTP request DELETE /participants/&lt;Type&gt;/&lt;ID&gt; (or DELETE /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to delete information in the server regarding the provided identity, defined by &lt;Type&gt; and &lt;ID&gt;) (for example, DELETE /participants/MSISDN/123456789), and optionally &lt;SubId&gt;. This HTTP request should support a query string to delete FSP information regarding a specific currency only. To delete a specific currency only, the HTTP request DELETE /participants/&lt;Type&gt;/&lt;ID&gt;?currency=XYZ should be used, where XYZ is the requested currency. Note -  The Account Lookup System should verify that it is the Party’s current FSP that is deleting the FSP information.
     * parameters: Accept
     * produces: application/json
     * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
     */
    delete: function ParticipantsByTypeAndID2(request, h) {
        return h.response({ errorInformation: { errorCode: '501', errorDescription: 'Not implemented' } }).code(501)
    }

};

