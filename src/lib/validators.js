'use strict'

const ErrorHandler = require('@mojaloop/central-services-error-handling')

/**
 * Blocked characters for party identifiers and sub-IDs.
 *
 * These protect against common injection and misconfiguration vectors:
 *   - \x00-\x1f : control characters (null bytes, tabs, escape sequences)
 *   - \s        : whitespace (spaces, newlines — overlaps with above but also
 *                 catches \x85, \xA0 via Unicode-aware \s)
 *   - {}        : URL template placeholders (the original #4144 bug)
 *   - <>        : HTML/XML tag injection
 *   - `         : template literal injection
 *   - \         : path traversal / escape sequences
 *
 * The FSPIOP spec defines PartyIdentifier as 1-128 non-whitespace characters.
 * We enforce that baseline plus the injection-vector blocklist above.
 */
const GENERAL_ID_PATTERN = /^[^\s\x00-\x1f{}<>`\\]{1,128}$/

/**
 * Type-specific format patterns.
 *
 * Applied only where an international standard defines the format
 * unambiguously. Intentionally permissive within each standard to
 * accommodate FSP variation across countries.
 *
 * Types without a pattern (PERSONAL_ID, BUSINESS, DEVICE, ACCOUNT_ID,
 * ALIAS, CONSENT, THIRD_PARTY_LINK) fall through to the general pattern.
 */
const TYPE_PATTERNS = {
  // E.164-ish: optional +, digits only. We allow up to 30 digits
  // (more than E.164's 15) because some FSPs prepend country codes
  // or use internal numbering beyond strict E.164.
  MSISDN: /^\+?\d{1,30}$/,

  // RFC 5321 simplified: local-part @ domain
  EMAIL: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,

  // ISO 13616: 2-letter country + 2 check digits + up to 30 alphanumeric
  IBAN: /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/
}

/**
 * @function validatePartyIdentifier
 * @description Validates a party identifier (the {ID} path parameter).
 *
 *   Validation layers (applied in order):
 *   1. Presence and type check
 *   2. Length check (max 128 per FSPIOP spec)
 *   3. General safety pattern (blocks injection vectors)
 *   4. Type-specific format (only for MSISDN, EMAIL, IBAN)
 *
 * @param {string} type - The PartyIdType (e.g. MSISDN, EMAIL, IBAN, ALIAS)
 * @param {string} id - The party identifier value
 * @throws {FSPIOPError} MALFORMED_SYNTAX (3000) if the ID fails validation
 */
const validatePartyIdentifier = (type, id) => {
  if (!id || typeof id !== 'string') {
    throw ErrorHandler.Factory.createFSPIOPError(
      ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
      'ID parameter is required and must be a string'
    )
  }

  if (id.length > 128) {
    throw ErrorHandler.Factory.createFSPIOPError(
      ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
      `ID parameter exceeds maximum length of 128 characters (got ${id.length})`
    )
  }

  if (!GENERAL_ID_PATTERN.test(id)) {
    throw ErrorHandler.Factory.createFSPIOPError(
      ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
      `Invalid ID parameter: '${id}'. Must be 1-128 printable characters with no whitespace, curly braces, angle brackets, backticks, or backslashes`
    )
  }

  const typePattern = TYPE_PATTERNS[type]
  if (typePattern && !typePattern.test(id)) {
    throw ErrorHandler.Factory.createFSPIOPError(
      ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
      `Invalid ${type} identifier: '${id}'`
    )
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

  if (typeof subId !== 'string' || subId.length > 128) {
    throw ErrorHandler.Factory.createFSPIOPError(
      ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
      'SubId must be a string of at most 128 characters'
    )
  }

  if (!GENERAL_ID_PATTERN.test(subId)) {
    throw ErrorHandler.Factory.createFSPIOPError(
      ErrorHandler.Enums.FSPIOPErrorCodes.MALFORMED_SYNTAX,
      `Invalid SubId parameter: '${subId}'. Must be 1-128 printable characters with no whitespace, curly braces, angle brackets, backticks, or backslashes`
    )
  }
}

/**
 * @function validatePathParameters
 * @description Validates all path parameters ({Type}, {ID}, optional {SubId}).
 *   This is the main entry point for handler/domain-level validation.
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
