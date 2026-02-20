import { describe, expect, it } from 'vitest'
import { getIssuedToOrgDisplayName } from './get-issued-to-org-display-name.js'

describe('#getIssuedToOrgDisplayName', () => {
  it('uses name for large producers even when tradingName is set', () => {
    const org = {
      name: 'Legal Name Ltd',
      tradingName: 'Some Trading Name',
      registrationType: 'LARGE_PRODUCER'
    }

    expect(getIssuedToOrgDisplayName(org)).toBe('Legal Name Ltd')
  })

  it('uses tradingName for compliance schemes when present', () => {
    const org = {
      name: 'Legal Scheme Ltd',
      tradingName: 'Compliance Trading Name',
      registrationType: 'COMPLIANCE_SCHEME'
    }

    expect(getIssuedToOrgDisplayName(org)).toBe('Compliance Trading Name')
  })

  it('falls back to name for compliance schemes when tradingName is null', () => {
    const org = {
      name: 'Legal Scheme Ltd',
      tradingName: null,
      registrationType: 'COMPLIANCE_SCHEME'
    }

    expect(getIssuedToOrgDisplayName(org)).toBe('Legal Scheme Ltd')
  })

  it('falls back to tradingName when registrationType is absent', () => {
    const org = {
      name: 'Legal Name',
      tradingName: 'Trading Name'
    }

    expect(getIssuedToOrgDisplayName(org)).toBe('Trading Name')
  })

  it('falls back to name when both registrationType and tradingName are absent', () => {
    const org = {
      name: 'Legal Name',
      tradingName: null
    }

    expect(getIssuedToOrgDisplayName(org)).toBe('Legal Name')
  })
})
