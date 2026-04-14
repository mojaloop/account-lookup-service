'use strict'

const { validatePathParameters, validatePartyIdentifier, validatePartySubIdOrType } = require('../../../src/lib/validators')

describe('validators', () => {
  describe('validatePartyIdentifier', () => {
    describe('general safety validation', () => {
      it('should reject null/undefined ID', () => {
        expect(() => validatePartyIdentifier('ALIAS', null)).toThrow(/required/)
        expect(() => validatePartyIdentifier('ALIAS', undefined)).toThrow(/required/)
      })

      it('should reject empty string', () => {
        expect(() => validatePartyIdentifier('ALIAS', '')).toThrow(/required/)
      })

      it('should reject ID longer than 128 chars', () => {
        expect(() => validatePartyIdentifier('ALIAS', 'x'.repeat(129))).toThrow(/exceeds maximum length/)
      })

      it('should reject whitespace', () => {
        expect(() => validatePartyIdentifier('ALIAS', 'has space')).toThrow(/Invalid ID/)
        expect(() => validatePartyIdentifier('ALIAS', 'has\ttab')).toThrow(/Invalid ID/)
        expect(() => validatePartyIdentifier('ALIAS', 'has\nnewline')).toThrow(/Invalid ID/)
      })

      it('should reject curly braces (URL template placeholders)', () => {
        expect(() => validatePartyIdentifier('ALIAS', '{ID}')).toThrow(/Invalid ID/)
        expect(() => validatePartyIdentifier('ALIAS', 'some{val}ue')).toThrow(/Invalid ID/)
      })

      it('should reject angle brackets (HTML injection)', () => {
        expect(() => validatePartyIdentifier('ALIAS', '<script>')).toThrow(/Invalid ID/)
        expect(() => validatePartyIdentifier('ALIAS', 'a<b>c')).toThrow(/Invalid ID/)
      })

      it('should reject backticks (template literal injection)', () => {
        expect(() => validatePartyIdentifier('ALIAS', '`inject`')).toThrow(/Invalid ID/)
      })

      it('should reject backslash (path traversal)', () => {
        expect(() => validatePartyIdentifier('ALIAS', 'path\\file')).toThrow(/Invalid ID/)
      })

      it('should reject control characters', () => {
        expect(() => validatePartyIdentifier('ALIAS', 'has\x00null')).toThrow(/Invalid ID/)
        expect(() => validatePartyIdentifier('ALIAS', 'has\x1fescape')).toThrow(/Invalid ID/)
      })

      it('should accept valid free-form identifiers', () => {
        expect(() => validatePartyIdentifier('ALIAS', 'my-alias_123')).not.toThrow()
        expect(() => validatePartyIdentifier('ALIAS', 'user@example.com')).not.toThrow()
        expect(() => validatePartyIdentifier('ALIAS', 'ABC-123/456')).not.toThrow()
        expect(() => validatePartyIdentifier('ALIAS', "it's-valid")).not.toThrow()
        expect(() => validatePartyIdentifier('ALIAS', 'x'.repeat(128))).not.toThrow()
      })
    })

    describe('MSISDN type-specific validation', () => {
      it('should accept valid MSISDN (digits only)', () => {
        expect(() => validatePartyIdentifier('MSISDN', '123456789')).not.toThrow()
      })

      it('should accept MSISDN with + prefix', () => {
        expect(() => validatePartyIdentifier('MSISDN', '+254712345678')).not.toThrow()
      })

      it('should reject non-numeric MSISDN', () => {
        expect(() => validatePartyIdentifier('MSISDN', 'not-a-phone')).toThrow(/Invalid MSISDN/)
        expect(() => validatePartyIdentifier('MSISDN', 'abc123')).toThrow(/Invalid MSISDN/)
      })
    })

    describe('EMAIL type-specific validation', () => {
      it('should accept valid email', () => {
        expect(() => validatePartyIdentifier('EMAIL', 'user@example.com')).not.toThrow()
        expect(() => validatePartyIdentifier('EMAIL', 'first.last+tag@sub.domain.org')).not.toThrow()
      })

      it('should reject email without @', () => {
        expect(() => validatePartyIdentifier('EMAIL', 'not-an-email')).toThrow(/Invalid EMAIL/)
      })

      it('should reject email without domain', () => {
        expect(() => validatePartyIdentifier('EMAIL', 'user@')).toThrow(/Invalid EMAIL/)
      })
    })

    describe('IBAN type-specific validation', () => {
      it('should accept valid IBAN', () => {
        expect(() => validatePartyIdentifier('IBAN', 'GB82WEST12345698765432')).not.toThrow()
        expect(() => validatePartyIdentifier('IBAN', 'DE89370400440532013000')).not.toThrow()
      })

      it('should reject IBAN without country code', () => {
        expect(() => validatePartyIdentifier('IBAN', '12345678901234')).toThrow(/Invalid IBAN/)
      })
    })

    describe('types without specific validation', () => {
      const freeFormTypes = ['PERSONAL_ID', 'BUSINESS', 'DEVICE', 'ACCOUNT_ID', 'CONSENT', 'THIRD_PARTY_LINK']

      freeFormTypes.forEach(type => {
        it(`should accept alphanumeric ID for ${type}`, () => {
          expect(() => validatePartyIdentifier(type, 'ABC-123_456')).not.toThrow()
        })
      })
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
      expect(() => validatePartySubIdOrType('x'.repeat(129))).toThrow(/at most 128/)
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
})
