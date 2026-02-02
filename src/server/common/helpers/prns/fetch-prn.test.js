import { describe, it, expect } from 'vitest'
import { fetchPrn } from './fetch-prn.js'

describe('#fetchPrn', () => {
  it('returns PRN data matching the requested prnNumber', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'ER2625468U')

    expect(result).not.toBeNull()
    expect(result.prnNumber).toBe('ER2625468U')
    expect(result.status).toBe('awaiting_authorisation')
  })

  it('returns null when prnNumber is not found', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'NONEXISTENT')

    expect(result).toBeNull()
  })

  it('returns a PRN with status', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'ER992415095748M')

    expect(result.status).toBe('awaiting_acceptance')
  })

  it('returns expected fields on a matched PRN', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'ER2625468U')

    expect(result).toStrictEqual(
      expect.objectContaining({
        prnNumber: 'ER2625468U',
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
