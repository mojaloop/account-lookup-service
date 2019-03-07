'use strict'

const request = require('request')

const requestOracleRegistry = (url, method, headers, payload = undefined) => {
  const requestOptions = {
    url,
    method: method,
    headers: headers,
    body: payload,
    agentOptions: {
      rejectUnauthorized: false
    }
  }
  Logger.debug(`request: ${JSON.stringify(requestOptions)}`)

  return new Promise((resolve, reject) => {
    return request(requestOptions, (error, response, body) => {
      if (error) {
        Logger.error(`ERROR: ${error}, response: ${JSON.stringify(response)}`)
        return reject(error)
      }
      Logger.info(`SUCCESS with body: ${JSON.stringify(response.body)}`)
      return resolve(response)
    })
  })
}

module.exports = {
  requestOracleRegistry
}