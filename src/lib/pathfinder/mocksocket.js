
const EventEmitter = require('events');

class MockSocket extends EventEmitter {
    // TODO: take write(), getPeerCertificate(), destroy() callback functions in the options
    // argument? Don't override these functions, but call the callbacks when the originals are
    // called. I.e.
    // write(buf) { this.logger('whatever', buf); this.writeCb(buf); }
    constructor({ writeCb = () => {}, destroyCb = () => {}, logger = () => {} } = {}) {
        super();
        this.logger = logger;
        this.destroyCallCount = 0;
        this.writeF = writeCb;
        this.destroyF = destroyCb;
    }

    // Interface used by tlsResolver

    destroy() {
        this.logger('MockSocket.destroy() called');
        this.destroyF(this, ++this.destroyCallCount);
    }

    getPeerCertificate() {
        return 'Mock peer certificate';
    }

    write(buf) {
        this.logger('MockSocket.write() called with', buf);
        this.writeF(this, buf);
    }

    // Test interface - used to drive tlsResolver
    // MockSocket.emit('error', () => {
    //    let e = new Error('socket hang up'); e.code = 'ECONNRESET'; return e;
    // }());
    // MockSocket.emit('data', Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]));
    // MockSocket.emit('data', Buffer.from('DEADBEEF', 'hex'));
}

// TODO: it might be better to create another class such as 'class SocketFactory extends Function'
module.exports.createSocket = (opts) => {
    const socket = new MockSocket(opts);
    return {
        connectFunc: (socketOpts, cb) => {
            setImmediate(cb);
            return socket;
        },
        socket
    };
};
