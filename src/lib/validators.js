'use strict'

const ErrorHandler = require('@mojaloop/central-services-error-handling')

/**
 * General safety pattern for party identifiers and sub-IDs.
 *
 * Blocks injection and misconfiguration vectors:
 *   \x00-\x1f  control characters (null bytes, tabs, escape sequences)
 *   \s         whitespace (FSPIOP spec: PartyIdentifier is non-whitespace)
 *   {}         URL template placeholders (the original #4144 bug)
 *   <>         HTML/XML tag injection
 *   `          template literal injection
 *   \          path traversal / escape sequences
 */
// eslint-disable-next-line no-control-regex
const GENERAL_ID_PATTERN = /^[^\s\x00-\x1f{}<>`\\]{1,128}$/

/**
 * Type-specific format patterns.
 *
 * Applied only where an international standard defines the format
 * unambiguously. Types without a pattern (PERSONAL_ID, BUSINESS, DEVICE,
 * ACCOUNT_ID, ALIAS, CONSENT, THIRD_PARTY_LINK) use the general pattern only.
 */
const TYPE_PATTERNS = {
  MSISDN: /^\+?\d{1,30}$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  IBAN: /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/
}

const throwMalformedSyntax = (message) => {
  throw ErrorHandler.Factory.createFSPIOPError(
    ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
    message
  )
}

/**
 * @function validateSafeString
 * @description Validates a string parameter against general safety rules.
 * @param {string} value - The value to validate
 * @param {string} label - Parameter name for error messages (e.g. 'ID', 'SubId')
 * @throws {FSPIOPError} MALFORMED_SYNTAX (3000) on failure
 */
const validateSafeString = (value, label) => {
  if (!value || typeof value !== 'string') {
    throwMalformedSyntax(`${label} parameter is required and must be a string`)
  }
  if (value.length > 128) {
    throwMalformedSyntax(`${label} parameter exceeds maximum length of 128 characters (got ${value.length})`)
  }
  if (!GENERAL_ID_PATTERN.test(value)) {
    throwMalformedSyntax(`Invalid ${label} parameter: '${value}'. Must be 1-128 printable characters with no whitespace, curly braces, angle brackets, backticks, or backslashes`)
  }
}

/**
 * @function validatePartyIdentifier
 * @description Validates a party identifier ({ID} path parameter).
 *   Applies general safety checks then type-specific format validation.
 *
 * @param {string} type - The PartyIdType (e.g. MSISDN, EMAIL, IBAN, ALIAS)
 * @param {string} id - The party identifier value
 * @throws {FSPIOPError} MALFORMED_SYNTAX (3000) if the ID fails validation
 */
const validatePartyIdentifier = (type, id) => {
  validateSafeString(id, 'ID')

  const typePattern = TYPE_PATTERNS[type]
  if (typePattern && !typePattern.test(id)) {
    throwMalformedSyntax(`Invalid ${type} identifier: '${id}'`)
  }
}

/**
 * @function validatePartySubIdOrType
 * @description Validates the optional {SubId} path parameter.
 *
 * @param {string} subId - The SubId value
 * @throws {FSPIOPError} MALFORMED_SYNTAX (3000) if invalid
 */
const validatePartySubIdOrType = (subId) => {
  if (!subId) return
  validateSafeString(subId, 'SubId')
}

/**
 * @function validatePathParameters
 * @description Validates all path parameters ({Type}, {ID}, optional {SubId}).
 *
 * @param {object} params - { Type, ID, SubId? }
 * @throws {FSPIOPError} MALFORMED_SYNTAX (3000) on validation failure
 */
const validatePathParameters = (params) => {
  validatePartyIdentifier(params.Type, params.ID)
  validatePartySubIdOrType(params.SubId)
}

module.exports = {
  validatePathParameters,
  validatePartyIdentifier,
  validatePartySubIdOrType,
  TYPE_PATTERNS,
  GENERAL_ID_PATTERN
}
