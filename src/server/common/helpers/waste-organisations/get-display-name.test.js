import { describe, expect, it } from 'vitest'
import { getDisplayName } from './get-display-name.js'

describe('#getDisplayName', () => {
  describe('when registrations are present (full WasteOrganisation)', () => {
    it('uses name for large producers even when tradingName is set', () => {
      const org = {
        name: 'Legal Name Ltd',
        tradingName: 'Some Trading Name',
        registrations: [{ type: 'LARGE_PRODUCER' }]
      }

      expect(getDisplayName(org)).toBe('Legal Name Ltd')
    })

    it('uses name for small producers', () => {
      const org = {
        name: 'Small Producer Ltd',
        tradingName: 'Small Trading',
        registrations: [{ type: 'SMALL_PRODUCER' }]
      }

      expect(getDisplayName(org)).toBe('Small Producer Ltd')
    })

    it('uses tradingName for compliance schemes when present', () => {
      const org = {
        name: 'Legal Scheme Ltd',
        tradingName: 'Compliance Trading Name',
        registrations: [{ type: 'COMPLIANCE_SCHEME' }]
      }

      expect(getDisplayName(org)).toBe('Compliance Trading Name')
    })

    it('falls back to name for compliance schemes when tradingName is null', () => {
      const org = {
        name: 'Legal Scheme Ltd',
        tradingName: null,
        registrations: [{ type: 'COMPLIANCE_SCHEME' }]
      }

      expect(getDisplayName(org)).toBe('Legal Scheme Ltd')
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
