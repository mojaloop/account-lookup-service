'use strict'

// Add synchronous error responses here
module.exports.syncData = {
  badRequestMalformedMSISDN: {code: 400, id: '3101', msg: 'Bad request - Malformed "MSISDN"'},
  badRequestMalformedContentType: {code: 400, id: '3101', msg: 'Bad request - Malformed "Content-Type"'},
  badRequestMalformedType: {code: 400, id: '3101', msg: 'Bad request - Malformed "Type"'},
  badRequestMalformedAccept: {code: 400, id: '3101', msg: 'Bad request - Malformed "Accept"'},
  badRequestMissingContentType: {code: 400, id: '3101', msg: 'Bad request - Missing "Content-Type"'},
  badRequestMissingAccept: {code: 400, id: '3101', msg: 'Bad request - Missing "Accept"'},
  badRequestUnacceptableVersion: {
    code: 400,
    id: '3001',
    msg: 'The client requested an unsupported version, see extension list for supported version(s).'
  }
}

// Add asynchronous error responses here
module.exports.asyncData = {
  invalidFsp: {id: '3201', msg: 'Destination FSP does not exist or cannot be found'},
  msisdnNotFound: {id: '3200', msg: 'Generic ID not found'},
  serverError: {id: '500', msg: 'Internal error'}
}

module.exports.makePayload = function ({id, msg}) {
  return {
    errorInformation: {
      errorCode: id,
      errorDescription: msg
    }
  }
}

// console.log(Object.entries(module.exports.asyncData));
// [ [ 'msisdnNotFound', { id: '3200', msg: 'Generic ID not found' } ] ]

module.exports.async = Object.entries(module.exports.asyncData).reduce(
  (pv, [key, val]) => Object.assign(pv, {[key]: module.exports.makePayload(val)}),
  {}
)

function f({code, ...rest}) {
  return h => h.response(module.exports.makePayload(rest)).code(code).header('Content-Type', 'application/json')
}

module.exports.build = Object.entries(module.exports.syncData).reduce(
  (pv, [key, val]) => Object.assign(pv, {[key]: f(val)}),
  {}
)
