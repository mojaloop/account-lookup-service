'use strict'

const SWITCH_FSPIOP_SOURCE_HEADER = 'switch'
const fetch = require('node-fetch')
const defaultHeaderWhitelist = [
  'accept',
  'fspiop-destination',
  'fspiop-http-method',
  'fspiop-signature',
  'fspiop-source',
  'fspiop-uri',
  'date',
  'content-type'
]

// We queue requests and responses such that it doesn't block us sending a 202 to the initiator of
// this particular request. If we didn't queue our response, it's possible that an initiator could
// implement the request as follows, and we could begin sending the response between steps 2 and 3,
// causing an error for the initiator's response handling.
// 1) send request to switch
// 2) wait for 202
// 3) prepare for response
module.exports = {
  augmentHeadersWithDefaults,
  buildPath,
  caseMapHeaders,
  createErrorUrl,
  defaultHeaders,
  defaultHeaderWhitelist,
  filterHeaders,
  queueRequest: rq.bind(null, 'GET'),
  queueResponse: rq.bind(null, 'PUT'),
  sendError,
  setHeaders
}

// TODO: this is basically the end of the world and should be burned
// MTN handles and filters HTTP headers case-sensitively. So we send them in a specific case.. (sad)
function caseMapHeaders(headers) {
  const map = {
    'fspiop-source': 'FSPIOP-Source',
    'fspiop-destination': 'FSPIOP-Destination',
    'fspiop-http-method': 'FSPIOP-HTTP-Method',
    'fspiop-signature': 'FSPIOP-Signature',
    'fspiop-uri': 'FSPIOP-URI',
    'date': 'Date',
    'content-type': 'Content-Type',
    'accept': 'Accept'
  }
  return Object.entries(headers).map(([k, v]) => [k in map ? map[k.toLowerCase()] : k, v]).reduce((pv, [k, v]) => ({
    ...pv,
    [k]: v
  }), {})
}

function filterObject(headers, f) {
  return Object.entries(headers).filter(([k, v]) => f(k, v)).reduce((pv, [k, v]) => ({...pv, [k]: v}), {})
}

function filterHeaders(headers, whitelist = defaultHeaderWhitelist) {
  const keyInWhitelist = k => undefined !== whitelist.find(s => s.toLowerCase() === k.toLowerCase())
  return filterObject(headers, keyInWhitelist)
}

const getKeyCaseInsensitive = (o, key) => Object.keys(o).find(k => k.toLowerCase() === key.toLowerCase())

// Headers is a POJO of headers, header is a case-insensitive header key string
function setHeaders(headers, newHeaders) {
  return Object.entries(newHeaders).reduce((pv, [header, value]) => {
    const existingHeader = getKeyCaseInsensitive(headers, header)
    if (existingHeader === undefined) {
      return {...pv, [header]: value}
    }
    return {...pv, [existingHeader]: value}
  }, headers)
}

// will strip all trailing and leading slashes- re/apply these as required
function buildPath(...args) {
  const stripExpr = /(^\/+|\/+$)/g
  return args.map(el => el.replace(stripExpr, '')).join('/')
}

async function rq(method, url, body, headers, {
  logger = () => {
  }
} = {}) {
  if (headers === undefined) {
    throw new Error('Headers required by API spec')
  }
  const opts = {method, headers: caseMapHeaders(headers), body: JSON.stringify(body)}
  setImmediate(async () => {
    try {
      logger(`Executing ${method}`, url, 'with opts:', opts)
      const res = await fetch(url, opts)
      logger('response: ', res)
      if (!res.ok) {
        // TODO: how does one identify the failed response?
        throw new Error('Failed to send. Result:', res)
      }
    } catch (err) {
      // TODO: Should we send the error to the requester? (We already seem to have failed to
      // communicate with them- or was that really what happened?)
      logger('An error occurred in a queued HTTP request:', err, 'URL:', url, 'opts:', opts)
    }
  })
}

async function sendError(url, body, headers, {
  logger = () => {
  }
} = {}) {
  if (headers === undefined) {
    throw new Error('Headers required by API spec')
  }
  const opts = {headers, method: 'PUT', body: JSON.stringify(body)}
  try {
    logger('Executing PUT', url, 'with opts:', opts)
    const res = await fetch(url, opts)
    if (!res.ok) {
      // TODO: how does one identify the failed response?
      throw new Error('Failed to send response to', url, '. Result:', res)
    }
  } catch (err) {
    // TODO: Should we send the error to the requester? (We already seem to have failed to
    // communicate with them- or was that really what happened?)
    logger('An error occurred in a queued HTTP request:', err, 'URL:', url, 'opts:', opts)
  }
}


// Create header defaults where they don't already exist in the provided headers
function augmentHeadersWithDefaults(headers, destination, resource) {
  // TODO: See API section 3.2.1; what should we do about X-Forwarded-For? Also, should we
  // add/append to this field in all 'queueResponse' calls?
  return {
    ...module.exports.defaultHeaders(destination, resource),
    ...headers
  }
}

function defaultHeaders(destination, resource, version = '1.0') {
  // TODO: See API section 3.2.1; what should we do about X-Forwarded-For? Also, should we
  // add/append to this field in all 'queueResponse' calls?
  return {
    'FSPIOP-Destination': destination,
    'Content-Type': `application/vnd.interoperability.${resource}+json;version=${version}`,
    'Date': (new Date()).toUTCString(),
    'FSPIOP-Source': SWITCH_FSPIOP_SOURCE_HEADER // TODO: what should this be? Config?
  }
}

async function createErrorUrl(database, path, participantName) {
  const ep = await database.getParticipantEndpointByName(participantName)
  return `${ep}/${path}/error`
}
