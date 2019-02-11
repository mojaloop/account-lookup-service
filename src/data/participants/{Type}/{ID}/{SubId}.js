'use strict';
var Mockgen = require('../../../mockgen.js');
/**
 * Operations on /participants/{Type}/{ID}/{SubId}
 */
module.exports = {
    /**
     * summary: ParticipantsSubIdByTypeAndID
     * description: The HTTP request GET /participants/&lt;Type&gt;/&lt;ID&gt; (or GET /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to find out in which FSP the requested Party, defined by &lt;Type&gt;, &lt;ID&gt; and optionally &lt;SubId&gt;, is located (for example, GET /participants/MSISDN/123456789, or GET /participants/BUSINESS/shoecompany/employee1). This HTTP request should support a query string for filtering of currency. To use filtering of currency, the HTTP request GET /participants/&lt;Type&gt;/&lt;ID&gt;?currency=XYZ should be used, where XYZ is the requested currency.
     * parameters: Accept
     * produces: application/json
     * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
     * operationId: ParticipantsSubIdByTypeAndID
     */
    get: {
        202: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '202'
            }, callback);
        },
        400: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '400'
            }, callback);
        },
        401: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '401'
            }, callback);
        },
        403: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '403'
            }, callback);
        },
        404: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '404'
            }, callback);
        },
        405: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '405'
            }, callback);
        },
        406: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '406'
            }, callback);
        },
        501: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '501'
            }, callback);
        },
        503: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '503'
            }, callback);
        }
    },
    /**
     * summary: ParticipantsSubIdByTypeAndID
     * description: The callback PUT /participants/&lt;Type&gt;/&lt;ID&gt; (or PUT /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the lookup, creation, or deletion of the FSP information related to the Party. If the FSP information is deleted, the fspId element should be empty; otherwise the element should include the FSP information for the Party.
     * parameters: body, Content-Length
     * produces: application/json
     * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
     * operationId: ParticipantsSubIdByTypeAndID3
     */
    put: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '200'
            }, callback);
        },
        400: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '400'
            }, callback);
        },
        401: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '401'
            }, callback);
        },
        403: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '403'
            }, callback);
        },
        404: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '404'
            }, callback);
        },
        405: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '405'
            }, callback);
        },
        406: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '406'
            }, callback);
        },
        501: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '501'
            }, callback);
        },
        503: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '503'
            }, callback);
        }
    },
    /**
     * summary: ParticipantsSubIdByTypeAndID
     * description: The HTTP request POST /participants/&lt;Type&gt;/&lt;ID&gt; (or POST /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to create information in the server regarding the provided identity, defined by &lt;Type&gt;, &lt;ID&gt;, and optionally &lt;SubId&gt; (for example, POST /participants/MSISDN/123456789 or POST /participants/BUSINESS/shoecompany/employee1).
     * parameters: body, Accept, Content-Length
     * produces: application/json
     * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
     * operationId: ParticipantsSubIdByTypeAndIDPost
     */
    post: {
        202: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '202'
            }, callback);
        },
        400: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '400'
            }, callback);
        },
        401: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '401'
            }, callback);
        },
        403: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '403'
            }, callback);
        },
        404: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '404'
            }, callback);
        },
        405: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '405'
            }, callback);
        },
        406: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '406'
            }, callback);
        },
        501: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '501'
            }, callback);
        },
        503: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'post',
                response: '503'
            }, callback);
        }
    },
    /**
     * summary: ParticipantsSubIdByTypeAndID
     * description: The HTTP request DELETE /participants/&lt;Type&gt;/&lt;ID&gt; (or DELETE /participants/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to delete information in the server regarding the provided identity, defined by &lt;Type&gt; and &lt;ID&gt;) (for example, DELETE /participants/MSISDN/123456789), and optionally &lt;SubId&gt;. This HTTP request should support a query string to delete FSP information regarding a specific currency only. To delete a specific currency only, the HTTP request DELETE /participants/&lt;Type&gt;/&lt;ID&gt;?currency=XYZ should be used, where XYZ is the requested currency. Note -  The Account Lookup System should verify that it is the Party’s current FSP that is deleting the FSP information.
     * parameters: Accept
     * produces: application/json
     * responses: 202, 400, 401, 403, 404, 405, 406, 501, 503
     * operationId: ParticipantsSubIdByTypeAndID2
     */
    delete: {
        202: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '202'
            }, callback);
        },
        400: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '400'
            }, callback);
        },
        401: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '401'
            }, callback);
        },
        403: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '403'
            }, callback);
        },
        404: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '404'
            }, callback);
        },
        405: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '405'
            }, callback);
        },
        406: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '406'
            }, callback);
        },
        501: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '501'
            }, callback);
        },
        503: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/participants/{Type}/{ID}/{SubId}',
                operation: 'delete',
                response: '503'
            }, callback);
        }
    }
};
