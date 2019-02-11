// (C)2018 ModusBox Inc.

const fs = require('fs');

const root = `${__dirname}/../..`;
const readDecode = fname => (new Buffer(fs.readFileSync(fname, 'ascii'), 'base64'));
const pathfinderEndpoints = {
    test: {
        url: '156.154.59.224',
        port: 7007
    },
    live: {
        url: 'pathfinder-ssl.neustar.biz',
        port: 7007
    }
};
/**
 * Loads required config items
 */
class Config {
    constructor() {
        const env = process.env['RUN_ENV'] || 'test';
        this.env = env;
        // Our secret key
        this.keyPath = process.env['CLIENT_KEY_FILENAME'] || `${root}/secrets_${env}/clientkey.pem.b64`;
        // The cert we'll use to identify ourselves to the pathfinder service
        this.certPath = process.env['CLIENT_CERT_FILENAME'] || `${root}/secrets_${env}/clientcert.pem.b64`;
        // Pathfinder's cert, we'll use this to authenticate pathfinder

        this.caPath = process.env['CA_CERT_FILENAME'] || `${root}/secrets_${env}/pathfindercert.pem.b64`;
        if (env === 'live') {
            this.caPath = process.env['CA_CERT_FILENAME'] || `${root}/secrets_live/pathfindercert_root_cert.pem.b64`;
            this.caPathIntermediate = process.env['CA_CERT_INTERMEDIATE_FILENAME'] || `${root}/secrets_live/pathfindercert_intermediate_cert.pem.b64`;
        }
        // this.caRootCertPath = process.env['CA_CERT_FILENAME'] || `${root}/secrets/pf_root_cert.pem.b64`;
        // this.caIntermediateCertPath = process.env['CA_CERT_FILENAME'] || `${root}/secrets/pf_intermediate_cert.pem.b64`;
        // The timeout for a query issued to the pathfinder module. This is *not* a timeout on
        // a query to pathfinder.
        this.queryTimeoutMs = process.env['QUERY_TIMEOUT_MS'] || (10 * 1000);
        // Maximum rate we'll supply queries to pathfinder
        this.maxQueriesPerSecond = process.env['MAX_QUERIES_PER_SECOND'] || 50;
        // Frequency of dummy keepalive messages to pathfinder.
        this.keepAliveIntervalMs = process.env['KEEPALIVE_INTERVAL_MS'] || 45 * 1000;
        // The timeout for a query issued to the pathfinder service.
        this.pathfinderTimeoutMs = process.env['PATHFINDER_TIMEOUT_MS'] || 5000;

        this.tls = {
            host: process.env['PATHFINDER_HOST'] || pathfinderEndpoints[env].url,
            port: process.env['PATHFINDER_PORT'] || pathfinderEndpoints[env].port,
            // reject for live
            // ignore for test
            rejectUnauthorized: env === 'live',
            key: readDecode(this.keyPath),
            cert: readDecode(this.certPath),
            ca: env === 'test' ? readDecode(this.caPath) : [readDecode(this.caPath), readDecode(this.caPathIntermediate)]
        };
    }
}

module.exports = Config;
