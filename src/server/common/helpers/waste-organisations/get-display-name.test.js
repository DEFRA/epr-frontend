import { describe, expect, it } from 'vitest'
import { getDisplayName } from './get-display-name.js'

describe('#getDisplayName', () => {
  describe('when year and registrations are present', () => {
    it('uses name for large producers even when tradingName is set', () => {
      const org = {
        name: 'Legal Name Ltd',
        tradingName: 'Some Trading Name',
        registrations: [{ type: 'LARGE_PRODUCER', registrationYear: 2026 }]
      }

      expect(getDisplayName(org, 2026)).toBe('Legal Name Ltd')
    })

    it('uses name for small producers', () => {
      const org = {
        name: 'Small Producer Ltd',
        tradingName: 'Small Trading',
        registrations: [{ type: 'SMALL_PRODUCER', registrationYear: 2026 }]
      }

      expect(getDisplayName(org, 2026)).toBe('Small Producer Ltd')
    })

    it('uses tradingName for compliance schemes when present', () => {
      const org = {
        name: 'Legal Scheme Ltd',
        tradingName: 'Compliance Trading Name',
        registrations: [{ type: 'COMPLIANCE_SCHEME', registrationYear: 2026 }]
      }

      expect(getDisplayName(org, 2026)).toBe('Compliance Trading Name')
    })

    it('falls back to name for compliance schemes when tradingName is null', () => {
      const org = {
        name: 'Legal Scheme Ltd',
        tradingName: null,
        registrations: [{ type: 'COMPLIANCE_SCHEME', registrationYear: 2026 }]
      }

      expect(getDisplayName(org, 2026)).toBe('Legal Scheme Ltd')
    })

    it('ignores registrations from other years', () => {
      const org = {
        name: 'Legal Name Ltd',
        tradingName: 'Old Scheme Name',
        registrations: [
          { type: 'COMPLIANCE_SCHEME', registrationYear: 2025 },
          { type: 'LARGE_PRODUCER', registrationYear: 2026 }
        ]
      }

      expect(getDisplayName(org, 2026)).toBe('Legal Name Ltd')
    })

    it('falls back to tradingName when no registrations match the year', () => {
      const org = {
        name: 'Legal Name Ltd',
        tradingName: 'Trading Name',
        registrations: [{ type: 'COMPLIANCE_SCHEME', registrationYear: 2025 }]
      }

      expect(getDisplayName(org, 2026)).toBe('Trading Name')
    })

    it('handles string registrationYear by coercing to number', () => {
      const org = {
        name: 'Legal Scheme Ltd',
        tradingName: 'Scheme Trading',
        registrations: [{ type: 'COMPLIANCE_SCHEME', registrationYear: '2026' }]
      }

      expect(getDisplayName(org, 2026)).toBe('Scheme Trading')
    })
  })

  describe('when registrations are absent (PRN data, companyDetails)', () => {
    it('uses tradingName when present', () => {
      const org = { name: 'Legal Name', tradingName: 'Trading Name' }

      expect(getDisplayName(org)).toBe('Trading Name')
    })

    it('falls back to name when tradingName is null', () => {
      const org = { name: 'Legal Name', tradingName: null }

      expect(getDisplayName(org)).toBe('Legal Name')
    })
  })
})
