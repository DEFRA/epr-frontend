import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchDecemberPrnEligibility } from './fetch-december-prn-eligibility.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(fetchDecemberPrnEligibility, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'test-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with correct path and options', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue({
      declaresDecemberWasteManually: true,
      windowOpen: true
    })

    await fetchDecemberPrnEligibility(
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/accreditations/acc-789/packaging-recycling-notes/december-prn-eligibility',
      {
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue({
      declaresDecemberWasteManually: false,
      windowOpen: false
    })

    await fetchDecemberPrnEligibility(
      'org/123',
      'reg&456',
      'acc#789',
      backendToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/accreditations/acc%23789/packaging-recycling-notes/december-prn-eligibility',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    const eligibility = {
      declaresDecemberWasteManually: true,
      windowOpen: true
    }
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(eligibility)

    const result = await fetchDecemberPrnEligibility(
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    )

    expect(result).toStrictEqual(eligibility)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(error)

    await expect(
      fetchDecemberPrnEligibility(
        organisationId,
        registrationId,
        accreditationId,
        backendToken
      )
    ).rejects.toThrow('Network error')
  })
})
