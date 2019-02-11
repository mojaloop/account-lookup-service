'use strict';

// (C)2018 ModusBox Inc.

// TODO:
// - test queueing of messages works correctly.
//   - can we queue multiple messages simultaneously?
//   - does the queue empty after all messages are processed?
//   - does the queue continue to function correctly if we disconnect while
//     it's non-empty?
//   - do we crash at any obvious point, such as after we've processed 0, 1, 2,
//     DNS_MAX_ID (set this to a small value to test) messages?
// - test TCP failure during operation- pathologically destroy the tls socket
//   from outside the app
// - implement pathfinder "keep-alive"
// - lint
// - automated tests. consider socket.emit('error', new Error('some message'))

const util = require('util');
const pp = util.inspect;
const tls = require('tls');

const dnsPacket = require('dns-packet');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const DNS_MIN_ID = 1;
const DNS_MAX_ID = 65534;

// TODO: could attempt to implement adaptive rate control. Whenever a message is successful, reduce
// queryTickIntervalMs by, say, 1ms. Then whenever a message fails, increase it by, say, 10%.
// Warning: the following sequence of events is possible:
// 1) queryTickIntervalMs is x, queryTimeoutMs is y, therefore max queue length is z = y / x
// 2) we accept z messages into the queue (i.e. the queue is full)
// 3) a pathfinder timeout/failure occurs (we hit the rate limit, perhaps)
// 4) queryTickIntervalMs is increased by 10%
// 5) now our full queue is going to take x * y * 1.1 milliseconds to process
// 6) but all messages handled after x * y milliseconds will fail because of their timeout
// So by increasing queryTickIntervalMs when our queue is full we guarantee ~9% of our queued
// messages will fail.
// We could:
//  - Take matters into our own hands, just change the query timeout for the affected requests. If
//    multiple failures occur, crash (like we do now). Consider setting a default query timeout,
//    and an upper bound. If any query timeout duration exceeds the upper bound, reject that query
//    or crash.
//  - Deliberately begin to reject messages when the queue is 90% full, leaving room for failure.
//    This doesn't help if we get two timeouts in quick succession.
//
// TODO: this class has become quite complex. It should be replaced with a more formally defined
// state machine. An intermediate step might be to extend EventEmitter to abstract the tick
// intervals.
//
// TODO: the public API is the part of the API not prefixed with underscores. This class should be
// split up into a class that implements the public API and (probably) a set of module-private
// functions that implement internal functionality.
//
// TODO: consider other queueing mechanisms, for example limiting the number of in-flight messages,
// but always having said number of messages in flight.
/**
 * Pathfinder resolver that connects over TLSv1.2
 */
module.exports = class TlsResolver {
    constructor(config, { logger = () => {} } = {}) {
        // DOCUMENTATION:
        // Query timeouts will begin to elapse as soon as a message is queued. This is to prevent
        // an indefinite build-up of messages in the queue.
        this.config = config;
        this.messagesInFlight = {};
        this.logger = logger;
        this.waitQueue = [];
        this.pendingCb = null;
        this.socket = null;
        this.data = {
            response: null,
            expectedLength: 0
        };
        // TODO: check pathfinder docs to determine an appropriate value for maxQueriesPerSecond.
        // TODO: write tests to verify the following note is in fact how this functions
        // Note, suppose one were to set 'maxQueriesPerSecond' to 1, and 'config.queryTimeoutMs' to
        // 500. Suppose two messages were then queued within one second. The first message would be
        // sent immediately, but the delay before the next was sent would be 1000ms. In this time,
        // the second message will fail.
        // TODO: should we expose queryTickIntervalMs instead of maxQueriesPerSecond in order to
        // avoid division and rounding? It moves some responsibility (but also understanding) onto
        // the user.
        this.queryTickIntervalMs = Math.round(1000 / this.config.maxQueriesPerSecond);
        this.lastTick = null;
    }

    // TODO: comments
    // Note that it is not necessary to wait on the result of connect before
    // issuing a query. However, any queries issued before connection will be
    // queued.
    // connectFunction is parametrised for testing
    connect(connectFunction = tls.connect) {
        // TODO: use context?
        // const secureContext = tls.createSecureContext({
        //     secureProtocol: 'TLSv1_2_method'
        // });
        let socketOpts = {
            ...this.config.tls,
            ca: Array.isArray(this.config.tls.ca) ? this.config.tls.ca : [this.config.tls.ca]
            // TODO: try these options
            //requestCert: true,
            //secureContext: context, //pathfinder does not support tls1.2?
        };

        this.logger('Using TLS socket options:', socketOpts);

        return new Promise((resolve, reject) => {
            // Explicitly allowing any error to bubble up
            const tempSocket = connectFunction(socketOpts, () => {
                this.socket = tempSocket;
                const peerCert = this.socket.getPeerCertificate();

                this.logger(
                    util.format('Connected to pathfinder host at %s:%s identifying itself with certificate: %s',
                        this.config.tls.host, this.config.tls.port, pp(peerCert)));

                // Start handling the queue
                this.latestSuccessfulSendTime = 0;
                this.lastTick = 0;
                this._schedule();

                resolve();
            });

            tempSocket.on('error', err => {
                // this will only reject the promise if it has not already
                // fulfilled, i.e. if we're not already connected/failed
                reject(err);
                this._handleSocketError(err);
            });

            tempSocket.on('data', this._handleSocketData.bind(this));
        });
    }

    // The following information was received from Pathfinder support:
    //
    //   PF server implements a mechanism to detect idle connections and disconnect them after a
    //   period of 60 seconds of inactivity. It is recommended that the client application sends a
    //   dummy query every 45 seconds as a “keepalive” indicator in order to keep the PF server
    //   from closing the TCP connection
    //
    // This function implements a keep-alive mechanism. It periodically checks to ensure a message
    // has been successfully sent in the past 45 seconds, and if not, sends an empty query to keep
    // the connection alive.
    //
    // This function exists (instead of just starting up the keepalive mechanism on connect) in
    // order to explicitly separate the keepalive logic, and make the user aware of the keepalive
    // behaviour.
    keepAlive(keepAliveIntervalMs = this.config.keepAliveIntervalMs) {
        // Clear the timer to keep behaviour sane if this function is called multiple times. This
        // won't do anything if there is no timer.
        clearTimeout(this.keepAliveTimer);
        this.keepAliveTimer = null;
        const now = Date.now();
        let nextKeepAlive = this.latestSuccessfulSendTime + keepAliveIntervalMs;
        if (now > nextKeepAlive) {
            this.logger('Sending keepalive message');
            this.query('').catch(err => this.logger('Error on keepalive message', err));
            nextKeepAlive = now + keepAliveIntervalMs;
        }
        this.keepAliveTimer = setTimeout(this.keepAlive.bind(this, keepAliveIntervalMs), nextKeepAlive - now);
    }

    // TODO: comments
    query(partyId, timeoutMs = this.config.queryTimeoutMs) {
        // add the message to the queue and trigger a callback for it to be handled
        let message = { partyId };
        const result = new Promise((resolve, reject) => {
            message = { resolve, reject, ...message };
            // set the timer after assigning new properties to message, otherwise
            // they won't appear in the bound 'message' argument
            message.queryTimer = setTimeout(this._handleQueryTimeout.bind(this, message), timeoutMs);
        });
        this._queueMessage(message);
        return result;
    }

    destroy() {
        this.logger('Destroying TLS resolver...');
        if(this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.logger('Destroyed TLS resolver');
    }

    _queueMessage(message) {
        // Here we calculate whether a message is doomed to time out. If it is, we'll just reject it
        // immediately. Note, this is quite silly behaviour if we're receiving replies with a
        // latency less than queryTickIntervalMs. Or, said another way, if queryTickIntervalMs is
        // larger than the request latency. However, we expect this never to be the case.
        const queueProcessingDuration = this.waitQueue.length * this.queryTickIntervalMs;
        if (queueProcessingDuration >= this.config.queryTimeoutMs) {
            return message.reject(new Error(
                `${this.waitQueue.length} messages queued. ` +
                `Handling ${this.config.maxQueriesPerSecond} per second. ` +
                `Minimum queue processing duration ${queueProcessingDuration}ms. ` +
                `Message timeout ${this.config.queryTimeoutMs}ms. ` +
                'Service at capacity, message could not succeed.'));
        }
        this.waitQueue.push(message);
        this._schedule();
    }

    // TODO: comments
    _genMessageId() {
        let id, min = DNS_MIN_ID, max = DNS_MAX_ID, maxAttempts = max - min, numAttempts = 0;

        // TODO: is there any reason this should be randomised? If the number
        // of in-flight messages becomes quite large, generating this number
        // will become quite inefficient- we'd be much better off with a
        // different technique. As a starting suggestion (but not necessarily
        // the best) a circular buffer of all integers in the range [min, max]
        // in a randomised order, popped from the buffer for use and returned
        // to the buffer after use.
        // Note that we can calculate our maximum message queue length using tick interval and
        // timeout. Therefore we could draw from a smaller pool.
        do {
            id = getRandomInt(min, max);
        } while (id in this.messagesInFlight && ++numAttempts < maxAttempts);

        if (numAttempts >= maxAttempts) {
            // we've failed to release resources somewhere, or we have more than 'maxAttempts'
            // messages in flight (which is unlikely).
            throw new Error(`Couldn\'t find unique message id; ${maxAttempts} messages in flight, or unique id message logic has failed`);
        }

        return id;
    }

    _attemptReconnect() {
        // Kill our socket, stop handling queries
        this.destroy();

        // Remove request data from all in-flight-queries then move
        // those queries back into the wait queue. Note that we do
        // *not* reset timers. This has the following effects:
        // 1) timeouts are from the moment the query enters this module
        // 2) timeouts prevent our queue from building forever if the connection repeatedly fails
        // TODO: in-flight messages should probably go to the front of the queue. Use unshift or
        // array unpacking this.waitQueue = [...messagesInFlight, ...this.waitQueue]
        const messagesInFlightArr = Object.values(this.messagesInFlight);
        this.messagesInFlight = {};
        messagesInFlightArr.forEach(m => delete m.request);
        this.waitQueue.push(...messagesInFlightArr);

        // Attempt reconnect- fatal on failure
        try {
            this.connect();
        } catch(err) {
            this.logger('FATAL. Pathfinder connect failed.', err);
            process.exit(1);
        }
    }

    _handlePathfinderTimeout(message) {
        // If our message timed out and there have been no successful queries since we attempted
        // it, we'll attempt reconnect; otherwise we'll retry the message
        if (this.latestSuccessfulSendTime < message.sentAt) {
            this.logger('Pathfinder timed out. Attempting reconnect.');
            this._attemptReconnect();
        } else {
            this._queueMessage(message);
        }
    }

    _handleSocketError(err) {
        // TODO: characterise possible errors- maybe we can handle
        // different errors differently to increase robustness
        this.logger('Socket error. Attempting reconnect.', err);
        this._attemptReconnect();
    }

    _handleSocketData(data) {
        this.logger('Received %d bytes', data.byteLength);

        // decode the message
        if (this.data.response == null) {
            // this is a new response, we are not expecting a continuation of a
            // previous packet
            if (data.byteLength > 1) {
                const plen = data.readUInt16BE(0);
                this.data.expectedLength = plen;
                if (plen < 12) {
                    this.logger('below DNS minimum packet length');
                }
                this.data.response = Buffer.from(data);
            }
        } else {
            // this is a continuation of a previous response
            this.data.response = Buffer.concat([this.data.response, data]);
        }

        if (this.data.response.byteLength >= this.data.expectedLength) {
            let resp = dnsPacket.streamDecode(this.data.response);
            this.logger('Decoded dns response message: %s', pp(resp));

            if (resp.answers.length > 1) {
                // TODO: We don't know what to do with multiple answers. We really shouldn't
                // receive more than one. Perhaps the best thing to do is just call back with the
                // first one? Or call resolve multiple times? (Is that allowed?). Read the
                // pathfinder docmentation to ascertain whether we will ever receive more than a
                // single answer.
                const request = pp(this.messagesInFlight[resp.id].request);
                delete this.messagesInFlight[resp.id];
                throw new Error(`Multiple answers received from pathfinder for query ${request}`);
            }

            if (this.messagesInFlight[resp.id]) {
                // Remove the message from our in-flight message pool
                const message = this.messagesInFlight[resp.id];
                delete this.messagesInFlight[resp.id];
                this.data.response = null;

                // store the successful message send time
                this.latestSuccessfulSendTime = Math.max(this.latestSuccessfulSendTime, message.sentAt);

                // clear the timeouts
                clearTimeout(message.queryTimer);
                clearTimeout(message.pathfinderTimer);

                // parse the response
                const parseResp = s => {
                    // turns e.g. mnc=02 into { mnc: 02 }
                    const kv = s.split('=');
                    return { [kv[0]]: kv[1] };
                };
                const result = resp.answers.length === 0 ? {} : resp.answers[0].data
                    .toString('ascii') // TODO: works, but is ascii specified in the docs? or DNS standard (surely not)?
                    .split(';')
                    .filter(e => /^.+=.+$/.test(e)) // remove anything that doesn't match .+=.+
                    .map(parseResp) // split on = and turn into k,v
                    .reduce((pv, cv) => ({ ...pv, ...cv })); // put all the k,v results of the map into one object
                this.logger('Got mcc', result.mcc, 'and mnc', result.mnc);

                // make the callback
                return message.resolve(result);
            }
        }
    }

    _schedule() {
        if (this.pendingCb === null && this.socket !== null) {
            const now = Date.now();
            this.lastTick = Math.max(this.lastTick + this.queryTickIntervalMs, now);
            this.pendingCb = setTimeout(this._processQueue.bind(this), this.lastTick - now);
        }
    }

    _handleQueryTimeout(message) {
        // TODO: check this message.request logic works- we need to be sure we're
        // removing messages from our in-flight message pool
        if (message.request) {
            delete this.messagesInFlight[message.request.id];
        }
        message.reject(new Error('Query timed out'));
    }

    _processQueue() {
        this.pendingCb = null;

        // If we don't have anything to process, we'll exit and not worry about
        // scheduling another processing callback
        if (this.waitQueue.length === 0) {
            return;
        }

        // If our socket is not connected, we can't process anything.
        // TODO: how can we be sure the socket is connecting?
        // TODO: logic for socket connect timeout
        // TODO: logic for returning unhealthy from health-check endpoint
        //       during socket connection?
        if (this.socket === null) {
            return;
        }

        // Pop a message off the queue and process it
        const first = this.waitQueue.shift();
        this._sendMessage(first);
        this._schedule();
    }

    _sendMessage(message) {
        // note we strip leading zeroes and + symbols, and remove whitespace from the partyId
        message.request = {
            type: 'query',
            questions: [{
                type: 'NAPTR',
                'class': 'IN',
                name: Array.from(message.partyId.replace(/^[+0]+|\s/g, '')).reverse().concat('e164enum.net').join('.')
            }]
        };
        // TODO: what are the pros and cons of using this.lastTick vs. Date.now() here?
        message.sentAt = this.lastTick;
        message.pathfinderTimer = setTimeout(this._handlePathfinderTimeout.bind(this, message), this.config.pathfinderTimeoutMs);
        this.logger('Querying pathfinder:', message.request);

        // give the query a unique id
        message.request.id = this._genMessageId();

        // map the callback to the messageid so we can call back when we get a response
        this.messagesInFlight[message.request.id] = message;

        // encode the packet
        let buf = dnsPacket.streamEncode(message.request);

        this.socket.write(buf);
    }
};
