'use strict';
var Mockgen = require('../../../../mockgen.js');
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
     * operationId: PartiesSubIdErrorByTypeAndID
     */
    put: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/parties/{Type}/{ID}/{SubId}/error',
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
                path: '/parties/{Type}/{ID}/{SubId}/error',
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
                path: '/parties/{Type}/{ID}/{SubId}/error',
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
                path: '/parties/{Type}/{ID}/{SubId}/error',
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
                path: '/parties/{Type}/{ID}/{SubId}/error',
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
                path: '/parties/{Type}/{ID}/{SubId}/error',
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
                path: '/parties/{Type}/{ID}/{SubId}/error',
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
                path: '/parties/{Type}/{ID}/{SubId}/error',
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
                path: '/parties/{Type}/{ID}/{SubId}/error',
                operation: 'put',
                response: '503'
            }, callback);
        }
    }
};
