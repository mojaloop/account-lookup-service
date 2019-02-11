'use strict';

const root = '..';
const Config = require(`${root}/config/config`);
const mockRequests = require(`${root}/data/mockrequests`);
const mockpf = require(`${root}/data/mockpf`);
const mockdb = require(`${root}/data/mockdb`);

module.exports.beforeEach = t => {
    const config = new Config();
    t.context = {
        config,
        requests: new mockRequests.MockRequests(),
        logger: console.log.bind(console),
        pathfinder: new mockpf.Pathfinder(config.pathfinder),
        db: new mockdb()
    };
};
