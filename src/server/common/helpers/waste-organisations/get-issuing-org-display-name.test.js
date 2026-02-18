import { describe, expect, it } from 'vitest'
import { getIssuingOrgDisplayName } from './get-issuing-org-display-name.js'

describe('#getIssuingOrgDisplayName', () => {
  it('uses tradingName when present', () => {
    const org = { name: 'Legal Name', tradingName: 'Trading Name' }

    expect(getIssuingOrgDisplayName(org)).toBe('Trading Name')
  })

  it('falls back to name when tradingName is null', () => {
    const org = { name: 'Legal Name', tradingName: null }

    expect(getIssuingOrgDisplayName(org)).toBe('Legal Name')
  })

  it('falls back to name when tradingName is undefined', () => {
    const org = { name: 'Legal Name' }

    expect(getIssuingOrgDisplayName(org)).toBe('Legal Name')
  })
})
