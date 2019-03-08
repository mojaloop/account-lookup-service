'use strict'

const errors = require('../lib/error/error').responses.async
const utils = require('./utils')

module.exports.handleMSISDNPartyRequest = async function ({database: db, pathfinder: pf, requests, logger}, req,) {
  try {
    // Mobile country code (mcc), mobile network code (mnc) together uniquely identify an mno
    const {mcc, mnc} = await pf.query(req.params.ID)

    const getErrorParams = async () => {
      const sourceParticipantName = req.headers['fspiop-source']
      const endpoint = await db.getParticipantEndpointByName(sourceParticipantName)
      const url = requests.buildPath(endpoint, req.path, 'error')
      const headers = requests.defaultHeaders(sourceParticipantName, 'parties')
      return {headers, url}
    }

    if (mcc === undefined || mnc === undefined) {
      const {url, headers} = await getErrorParams()
      requests.queueResponse(url, errors.msisdnNotFound, headers, {logger})
      return
    }

    // Now map mno to fsp/party
    try {
      const targetParticipantName = await db.getParticipantNameFromMccMnc(mcc, mnc)
      // Forward the request to the appropriate fsp
      const endpoint = await db.getParticipantEndpointByName(targetParticipantName)
      const headers = requests.setHeaders(requests.filterHeaders(req.headers),
        {'fspiop-destination': targetParticipantName})
      requests.queueRequest(requests.buildPath(endpoint, req.path), req.body, headers, {logger})
    } catch (err) {
      if (null == err.message.match('Could not find participant')) {
        throw err
      }
      const {url, headers} = await getErrorParams()
      requests.queueResponse(url, errors.invalidFsp, headers, {logger})
    }

  } catch (err) {
    throw ('stack' in err) ? err : new Error(err)
  }
}

// TODO: comments
// TODO: replace the call site with the inside of the function call?
module.exports.handleMSISDNPartyResponse = async function ({database: db, requests, logger}, req) {
  utils.forwardRequest(requests, db, req, {logger})
}

// TODO: replace the call site with the inside of the function call?
module.exports.handleMSISDNPartyErrorResponse = async function ({database: db, requests, logger}, req) {
  utils.forwardRequest(requests, db, req, {logger})
}
