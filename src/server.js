'use strict';

const util = require('util');

const Hapi = require('hapi');
const HapiOpenAPI = require('hapi-openapi');
const Path = require('path');
const Good = require('good');

const Config = require('./config/config.js');
const Database = require('./data/database.js');
const PathFinder = require('@lib/pathfinder');
const requests = require('@lib/requests');
const errors = require('@lib/error').responses;
const { anyVersion, parseAcceptHeader, parseContentTypeHeader } = require('@lib/validation');

// TODO: not sure we can really use this, there's a general fallback error type that we should
// consider (3000?), or we need to specify where exactly the failure occurred
const badRequestPayload = { errorInformation: { errorCode: '400', errorDescription: 'Bad request' } };

/**
 * Initializes a Hapi server
 *
 * @param db - database instance
 * @param config - configuration object
 */
const createServer = async function({ db, pathfinder, requests, config, logger = () => {} }) {
    const server = new Hapi.Server({
        address: config.listenAddress,
        host: config.listenAddress,
        port: config.listenPort,
        routes: {
            validate: {
                failAction: async (request, h, err) => {
                    logger(`validation failure in ${err.output.payload.validation.source}: ${err.stack || util.inspect(err)}`);
                    return h.response(badRequestPayload).header('Content-Type', 'application/json').code(400).takeover();
                }
            },
            // output validation logging
            response: {
                failAction: async (request, h, err) => {
                    logger(`output validation failure: ${err.stack || util.inspect(err)}`);
                    throw err;
                }
            }
        }
    });

    // Put db, pf, requests somewhere handlers can find them. Note that this
    // enables dependency injection.
    // TODO: consider making a class to put here, this way it'll be a little
    // easier for someone reading the code to see a coherent 'Application'
    // TODO: everyone understands "db", replace 'database: db' with 'db', and
    // all usages thereof from 'database' to 'db'
    Object.assign(server.app, { database: db, requests, pathfinder, logger });

    //add plugins to the server
    // TODO: we should log on every received request, the path, method, an id.
    // This can probably be done with a plugin here. Or
    // server.ext('onRequest', ...)
    await server.register([{
        plugin: HapiOpenAPI,
        options: {
            outputvalidation: true,
            api: Path.resolve('./config/swagger.json'),
            handlers: Path.resolve('./handlers')
        }
    }, {
        plugin: Good,
        options: {
            ops: {
                interval: 1000
            },
            reporters: {
                console: [{
                    module: 'good-squeeze',
                    name: 'Squeeze',
                    args: [{ log: '*', response: '*' }]
                }, {
                    module: 'good-console'
                }, 'stdout']
            }
        }
    }]);

    //add a health endpoint on /
    server.route({
        method: 'GET',
        path: '/',
        handler: async (req, h) => {
            // Check pathfinder connectivity is ok
            try {
                await pathfinder.query('');
            } catch(err) {
                return h.response({
                    statusCode: 500,
                    error: 'Internal Server Error',
                    message: `Pathfinder module error: ${err.message}` }).code(500);
            }
            if (!(await db.isConnected())) {
                return h.response({
                    statusCode: 500,
                    error: 'Internal Server Error',
                    message: 'Database not connected' }).code(500);
            }
            return h.response().code(200);
        }
    });

    // deal with the api spec content-type not being "application/json" which it actually is, and
    // hapi-openapi not validating as we'd like
    server.ext('onRequest', function(request, h) {
        // Don't validate healthchecks
        // TODO: put the healthcheck into the swagger. This is good because it documents the
        // healthcheck endpoint and we might be able to avoid special-case handling like this.
        if (request.path === '/') {
            return h.continue;
        }

        logger('NEW REQUEST');
        logger(request.method.toUpperCase(), request.path);
        logger('request path', request.path);
        logger('request method', request.method);
        logger('request payload', request.payload);
        logger('request headers', request.headers);

        // Validate the content-type header
        if (request.headers['content-type'] === undefined) {
            return errors.build.badRequestMissingContentType(h).takeover();
        }
        const parsed = parseContentTypeHeader(request.path, request.headers['content-type']);
        if (!parsed.valid) {
            return errors.build.badRequestMalformedContentType(h).takeover();
        }
        if (parsed.version !== '1.0') {
            return errors.build.badRequestUnacceptableVersion(h).takeover();
        }

        // Always validate the accept header for a get request, or optionally if it has been supplied
        if (request.method.toLowerCase() === 'get' || request.headers['accept']) {
            const header = request.headers['accept'];
            if (!header) {
                return errors.build.badRequestMissingAccept(h).takeover();
            }
            const validationResult = parseAcceptHeader(request.path, header);
            if (!validationResult.valid) {
                return errors.build.badRequestMalformedAccept(h).takeover();
            }
            if (!['1', '1.0', anyVersion].some(ver => validationResult.versions.has(ver))) {
                const err = errors.syncData.badRequestUnacceptableVersion;
                const payload = {
                    ...errors.makePayload(err),
                    extensionList: [ { key: '1', value: '0' } ]
                };
                return h.response(payload).code(err.code).takeover();
            }
        }
        return h.continue;
    });

    return server;
};

//initialise database connection pool and start the api server
const startApp = async function(config=new Config()) {
    const logger = (...args) => console.log(`[ ${(new Date()).toISOString()} ]`, ...args);
    try {
        // TODO: we should probably have config load synchronously, then load
        // the ca files in the pathfinder init
        //load config
        await config.init();

        logger('Loaded config', config);

        const database = new Database(config.database, { logger });
        const db = await database.connect();

        const pathfinder = new PathFinder(config.pathfinder, { logger });
        await pathfinder.connect();
        pathfinder.keepAlive();

        const server = await createServer({ db, pathfinder, requests, config, logger });

        //start the server
        await server.start();

        process.on('SIGTERM', () => {
            server.log(['info'], 'Received SIGTERM, closing server...');
            server.stop({ timeout: 10000 }).then(err => {
                logger('server stopped.', err ? (err.stack || util.inspect(err)) : '');
                process.exit((err) ? 1 : 0);
            });
        });

        server.plugins.openapi.setHost(server.info.host + ':' + server.info.port);
        server.log(['info'], `Server running on ${server.info.host}:${server.info.port}`);
    }
    catch(err) {
        logger(`Error initializing server: ${err.stack || util.inspect(err)}`);
        process.exit(1);
    }
};

if (require.main === module) {
    startApp();
} else {
    module.exports = { createServer };
}
