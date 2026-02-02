import { describe, it, expect } from 'vitest'
import { fetchPrn } from './fetch-prn.js'

describe('#fetchPrn', () => {
  it('returns PRN data matching the requested id', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'prn-001')

    expect(result).not.toBeNull()
    expect(result.id).toBe('prn-001')
    expect(result.status).toBe('awaiting_authorisation')
  })

  it('returns null when id is not found', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'NONEXISTENT')

    expect(result).toBeNull()
  })

  it('returns a PRN with status', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'prn-002')

    expect(result.status).toBe('awaiting_acceptance')
  })

  it('returns expected fields on a matched PRN', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'prn-001')

    expect(result).toStrictEqual(
      expect.objectContaining({
        id: 'prn-001',
        issuedToOrganisation: expect.objectContaining({
          name: expect.any(String)
        }),
        issuedByOrganisation: expect.objectContaining({
          name: expect.any(String)
        }),
        tonnageValue: expect.any(Number),
        status: expect.any(String)
      })
    )
  })
})
