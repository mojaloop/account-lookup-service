// (C)2018 ModusBox Inc.

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const pathfinderEndpoints = {
    test: {
        port: 7007,
        url: '156.154.59.224'
    },
    live: {
        port: 7007,
        url: 'pathfinder-ssl.neustar.biz'
    }
};

/**
 * Loads required config items
 */
class Config {
    constructor() {
        const env = process.env['RUN_ENV'] || 'test';
        this.env = env;
        this.listenAddress = process.env['LISTEN_ADDRESS'] || '0.0.0.0';
        this.listenPort = process.env['LISTEN_PORT'] || 3000;

        this.database = {
            client: process.env['DATABASE_DIALECT'] || 'mysql',
            connection: {
                host: process.env['DATABASE_HOST'] || 'db',
                port: process.env['DATABASE_PORT'] || '3306',
                user: process.env['DATABASE_USER'] || 'casa',
                password: process.env['DATABASE_PASSWORD'] || 'casa',
                database: process.env['DATABASE_SCHEMA'] || 'central_ledger'
            },
            pool: {
                min: process.env['DATABASE_POOL_MINSIZE'] || 10,
                max: process.env['DATABASE_POOL_MAXSIZE'] || 10
            }
        };

        // Our secret key
        this.keyPath = process.env['CLIENT_KEY_FILENAME'] || `./secrets_${env}/clientkey.pem.b64`;
        // The cert we'll use to identify ourselves to the pathfinder service
        this.certPath = process.env['CLIENT_CERT_FILENAME'] || `./secrets_${env}/clientcert.pem.b64`;
        // Pathfinder's cert, we'll use this to authenticate pathfinder
        this.caPath = process.env['CA_CERT_FILENAME'] || `./secrets_${env}/pathfindercert.pem.b64`;
        if (env === 'live') {
            this.caPath = process.env['CA_CERT_FILENAME'] || './secrets_live/pathfindercert_root_cert.pem.b64';
            this.caPathIntermediate = process.env['CA_CERT_INTERMEDIATE_FILENAME'] || './secrets_live/pathfindercert_intermediate_cert.pem.b64';
        }

        this.pathfinder = {
            tls: {
                // TODO: PATHFINDER_ENV needs to be set as mandatory
                host: process.env['PATHFINDER_HOST'] || pathfinderEndpoints[this.env].url,
                port: process.env['PATHFINDER_PORT'] || pathfinderEndpoints[this.env].port,
                // reject for live
                // ignore for test
                rejectUnauthorized: env === 'live'
            },
            // The timeout for a query issued to the pathfinder module. This is *not* a timeout on
            // a query to pathfinder.
            queryTimeoutMs: process.env['QUERY_TIMEOUT_MS'] || (10 * 1000),
            // Maximum rate we'll supply queries to pathfinder
            maxQueriesPerSecond: process.env['MAX_QUERIES_PER_SECOND'] || 50,
            // Frequency of dummy keepalive messages to pathfinder.
            keepAliveIntervalMs: process.env['KEEPALIVE_INTERVAL_MS'] || 45 * 1000,
            // The timeout for a query issued to the pathfinder service.
            pathfinderTimeoutMs: process.env['PATHFINDER_TIMEOUT_MS'] || 5000
        };
    }

    async init() {
        const env = process.env['RUN_ENV'] || 'test';
        // TODO: the following new Buffer call is somewhat redundant, however the exact behaviour
        // change to be expected isn't worth managing at the time of writing. We should be able to
        // replace the following line with:
        // const readDecode = async fname => await readFile(fname, 'ascii');
        const readDecode = async fname => (new Buffer(await readFile(fname, 'ascii'), 'ascii'));
        const toDecode = [this.keyPath, this.certPath, this.caPath];

        if (env === 'live') {
            toDecode.push(this.caPathIntermediate);
            [this.pathfinder.tls.key, this.pathfinder.tls.cert, this.pathfinder.tls.caPath, this.caPathIntermediate] =
              await Promise.all(toDecode.map(readDecode));
        } else {
            [this.pathfinder.tls.key, this.pathfinder.tls.cert, this.pathfinder.tls.caPath] =
              await Promise.all(toDecode.map(readDecode));
        }

    }
}

module.exports = Config;
