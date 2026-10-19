import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchDecemberPrnEligibility } from './fetch-december-prn-eligibility.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(fetchDecemberPrnEligibility, () => {
  const keys = {
    organisationNumber: '500123',
    registrationNumber: 'R26EN0000000001PL',
    year: '2026'
  }
  const backendToken = 'test-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets the eligibility under the accreditation PRNs', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue({
      mode: 'manual',
      windowOpen: true
    })

    await fetchDecemberPrnEligibility(keys, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes/december-prn-eligibility',
      {
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    const eligibility = {
      mode: 'manual',
      windowOpen: true
    }
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(eligibility)

    const result = await fetchDecemberPrnEligibility(keys, backendToken)

    expect(result).toStrictEqual(eligibility)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(
      new Error('Network error')
    )

    await expect(
      fetchDecemberPrnEligibility(keys, backendToken)
    ).rejects.toThrow('Network error')
  })
})
