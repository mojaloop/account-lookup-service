'use strict';
var Mockgen = require('../../../mockgen.js');
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
     * operationId: PartiesSubIdByTypeAndID
     */
    get: {
        202: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
                operation: 'get',
                response: '503'
            }, callback);
        }
    },
    /**
     * summary: PartiesSubIdByTypeAndID
     * description: The callback PUT /parties/&lt;Type&gt;/&lt;ID&gt; (or PUT /parties/&lt;Type&gt;/&lt;ID&gt;/&lt;SubId&gt;) is used to inform the client of a successful result of the Party information lookup.
     * parameters: body, Content-Length
     * produces: application/json
     * responses: 200, 400, 401, 403, 404, 405, 406, 501, 503
     * operationId: PartiesSubIdByTypeAndIDPut
     */
    put: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
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
                path: '/parties/{Type}/{ID}/{SubId}',
                operation: 'put',
                response: '503'
            }, callback);
        }
    }
};
