'use strict'

const Sinon = require('sinon')
const participant = require('../../../src/models/participantEndpoint/facade')
const {
  validatePathParameters,
  validatePartyIdentifier,
  validatePartySubIdOrType,
  validateSourceFspHeader
} = require('../../../src/lib/validators')

describe('validators', () => {
  describe('validatePartyIdentifier', () => {
    it.each([
      ['null', 'ALIAS', null, /required/],
      ['undefined', 'ALIAS', undefined, /required/],
      ['empty string', 'ALIAS', '', /required/],
      ['over 128 chars', 'ALIAS', 'x'.repeat(129), /exceeds maximum length/],
      ['whitespace', 'ALIAS', 'has space', /Invalid ID/],
      ['tab', 'ALIAS', 'has\ttab', /Invalid ID/],
      ['newline', 'ALIAS', 'has\nnewline', /Invalid ID/],
      ['curly braces {ID}', 'ALIAS', '{ID}', /Invalid ID/],
      ['embedded braces', 'ALIAS', 'some{val}ue', /Invalid ID/],
      ['angle brackets', 'ALIAS', '<script>', /Invalid ID/],
      ['backticks', 'ALIAS', '`inject`', /Invalid ID/],
      ['backslash', 'ALIAS', 'path\\file', /Invalid ID/],
      ['null byte', 'ALIAS', 'has\x00null', /Invalid ID/],
      ['control char', 'ALIAS', 'has\x1fescape', /Invalid ID/],
      ['non-numeric MSISDN', 'MSISDN', 'not-a-phone', /Invalid MSISDN/],
      ['alpha MSISDN', 'MSISDN', 'abc123', /Invalid MSISDN/],
      ['EMAIL without @', 'EMAIL', 'not-an-email', /Invalid EMAIL/],
      ['EMAIL without domain', 'EMAIL', 'user@', /Invalid EMAIL/],
      ['IBAN without country', 'IBAN', '12345678901234', /Invalid IBAN/]
    ])('should reject %s', (_desc, type, id, pattern) => {
      expect(() => validatePartyIdentifier(type, id)).toThrow(pattern)
    })

    it.each([
      ['free-form alias', 'ALIAS', 'my-alias_123'],
      ['email as alias', 'ALIAS', 'user@example.com'],
      ['slashes', 'ALIAS', 'ABC-123/456'],
      ['apostrophe', 'ALIAS', "it's-valid"],
      ['max length', 'ALIAS', 'x'.repeat(128)],
      ['digits MSISDN', 'MSISDN', '123456789'],
      ['+ prefix MSISDN', 'MSISDN', '+254712345678'],
      ['simple email', 'EMAIL', 'user@example.com'],
      ['tagged email', 'EMAIL', 'first.last+tag@sub.domain.org'],
      ['GB IBAN', 'IBAN', 'GB82WEST12345698765432'],
      ['DE IBAN', 'IBAN', 'DE89370400440532013000']
    ])('should accept %s', (_desc, type, id) => {
      expect(() => validatePartyIdentifier(type, id)).not.toThrow()
    })

    it.each(
      ['PERSONAL_ID', 'BUSINESS', 'DEVICE', 'ACCOUNT_ID', 'CONSENT', 'THIRD_PARTY_LINK']
    )('should accept alphanumeric ID for %s', (type) => {
      expect(() => validatePartyIdentifier(type, 'ABC-123_456')).not.toThrow()
    })
  })

  describe('validatePartySubIdOrType', () => {
    it('should pass for undefined/null SubId', () => {
      expect(() => validatePartySubIdOrType(undefined)).not.toThrow()
      expect(() => validatePartySubIdOrType(null)).not.toThrow()
    })

    it('should pass for valid SubId', () => {
      expect(() => validatePartySubIdOrType('validSub123')).not.toThrow()
    })

    it('should reject SubId with curly braces', () => {
      expect(() => validatePartySubIdOrType('{SubId}')).toThrow(/Invalid SubId/)
    })

    it('should reject SubId longer than 128 chars', () => {
      expect(() => validatePartySubIdOrType('x'.repeat(129))).toThrow(/exceeds maximum length/)
    })
  })

  describe('validatePathParameters', () => {
    it('should validate both ID and SubId', () => {
      expect(() => validatePathParameters({ Type: 'MSISDN', ID: '123456789' })).not.toThrow()
      expect(() => validatePathParameters({ Type: 'MSISDN', ID: '123456789', SubId: 'sub1' })).not.toThrow()
    })

    it('should reject invalid ID', () => {
      expect(() => validatePathParameters({ Type: 'MSISDN', ID: '{ID}' })).toThrow()
    })

    it('should reject invalid SubId', () => {
      expect(() => validatePathParameters({ Type: 'MSISDN', ID: '123456789', SubId: '{SubId}' })).toThrow()
    })
  })

  describe('validateSourceFspHeader', () => {
    let sandbox
    beforeEach(() => { sandbox = Sinon.createSandbox() })
    afterEach(() => sandbox.restore())

    it('resolves when the source FSP is known', async () => {
      sandbox.stub(participant, 'validateParticipant').resolves({ name: 'payerfsp' })
      await expect(validateSourceFspHeader({ 'fspiop-source': 'payerfsp' })).resolves.toBeUndefined()
    })

    it('throws MALFORMED_SYNTAX (3101) with the invalid fspiop-source message when unknown', async () => {
      sandbox.stub(participant, 'validateParticipant').resolves(null)
      await expect(validateSourceFspHeader({ 'fspiop-source': 'invalidFSPIOPText' }))
        .rejects.toMatchObject({
          apiErrorCode: { code: '3101' },
          message: 'invalid fspiop-source header'
        })
    })
  })
})
