'use strict'

module.exports.responses = require('./responses')

module.exports.ApplicationError = class ApplicationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ApplicationError'
  }
}
