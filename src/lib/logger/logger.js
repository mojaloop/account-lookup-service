'use strict';

const pp = require('util').format;

module.exports = class Logger {
    constructor(data, logger) {
        this.data = data;
        this.logger = logger;
    }

    push(data) {
        return new Logger({ ...this.data, ...data }, this.logger);
    }

    pop(...keys) {
        // remove the keys in keys
        let data = this.data; // shallow copy should be fine
        keys.forEach(k => delete data[k]);
        return new Logger(data, this.logger);
    }

    logStrings(...args) {
        this.logger({ ...this.data, timestamp: (new Date()).toISOString(), message: pp(...args)});
    }

    logObjs(...args) {
        // this.logger(args.reduce((pv, cv) => { ...pv, ...cv }, this.data, timestamp: (new Date()).toISOString()));
        let data = this.data;
        for (let i=0, m=args.length; i<m; i++) {
            let newEntries = Object.entries(args[i]);
            for (let j=0, n=newEntries.length; j<n; j++) {
                data[newEntries[j][0]] = newEntries[j][1];
            }
        }
        data.timestamp = (new Date()).toISOString();
        this.logger(data);
    }

    log(...args) {
        this.logStrings(...args);
    }

    logAtLevel(level, ...args) {
        this.logObjs({ message: pp(...args), level });
    }

    error(...args) {
        this.logAtLevel('error', ...args);
    }

    warning(...args) {
        this.logAtLevel('warning', ...args);
    }

    info(...args) {
        this.logAtLevel('info', ...args);
    }
};
