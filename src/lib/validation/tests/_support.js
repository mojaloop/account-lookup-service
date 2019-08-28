'use strict';

const chance = new require('chance')();
const anyVersion = require('../anyVersion');

// Why not expose the class? Well, the only reason I'm using a class here is as an object that can
// reference itself in its definition. Why use an object? To organise the utilities within it
// logically. So treat this like a POJO.
module.exports = new (class {

    validHeaders(resource) {
        return [
            `application/vnd.interoperability.${resource}+json;version=1`,
            `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1`,
            `application/vnd.interoperability.${resource}+json;version=1.0`,
            `application/vnd.interoperability.${resource}+json;version=1.0,application/vnd.interoperability.${resource}+json;version=1.1`,
            `application/vnd.interoperability.${resource}+json;version=1.1`,
            `application/vnd.interoperability.${resource}+json;version=2.0`,
            `application/vnd.interoperability.${resource}+json;version=2.1`,
            `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=2.1`,
            `application/vnd.interoperability.${resource}+json;version=12`,
            `application/vnd.interoperability.${resource}+json;version=12.0`,
            `application/vnd.interoperability.${resource}+json;version=12.12`,
            `application/vnd.interoperability.${resource}+json;version=12.12,application/vnd.interoperability.${resource}+json;version=1`,
            `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112`,
            `application/vnd.interoperability.${resource}+json;version=1,application/vnd.interoperability.${resource}+json;version=1.112,application/vnd.interoperability.${resource}+json;version=1`
        ];
    }

    invalidHeaders(resource) {
        return [
            'whatever',
            'application/vnd.interoperability.whatever+json;version=1, ',
            `application/vnd.interoperability.a${resource}+json;version=1, `,
            `application/vnd.interoperability.${resource}+json;version=1, `,
            `application/vnd.interoperability.${resource}+json;version=1, application/vnd.interoperability.${resource}+json;version=1`,
            ...this.validHeaders(resource).map(h => h.toUpperCase())
        ];
    }

    verToVerStr(ver) {
        return ver === anyVersion ? '' : `;version=${ver}`;
    }

    // Generate a version between 0 and 999.999, or 'any' version (no version). For the reader's
    // understanding: versions should match the following regex: /^\d{1,3}(.\d{1,3})?$/
    randomVersion(chanceOfAny = 0.2) {
        return Math.random() < chanceOfAny ? anyVersion : (chance.floating({ min: 0, max: 110, fixed: chance.integer({ min: 0, max: 3 }) }));
    }

    generateAcceptVersions(count = Math.round(1 + Math.random() ** 4 * 10)) {
        return Array.from({ length: count }, () => this.randomVersion());
    }

    // Generate a valid accept header, given the resource and versions of interest
    generateAcceptHeader(resource, versions) {
        return versions.map(v => `application/vnd.interoperability.${resource}+json${this.verToVerStr(v)}`).join(',');
    }

    generateContentTypeVersion() {
        return chance.floating({ min: 0, max: 110, fixed: chance.integer({ min: 1, max: 3 }) });
    }

    // Generate a valid content type header, given the resource and version of interest
    generateContentTypeHeader(resource, version) {
        return `application/vnd.interoperability.${resource}+json;version=${version % 1 === 0 ? version.toFixed(1) : version}`;
    }

    generateRegex(resource) {
        return new RegExp(`^application/vnd\\.interoperability\\.${resource}\\+json;version=\\d+(\\.\\d+)?(,application/vnd\\.interoperability\\.parties\\+json;version=\\d+(\\.\\d+)?)*$`);
    }
})();
