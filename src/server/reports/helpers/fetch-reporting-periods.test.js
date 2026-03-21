import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchReportingPeriods } from './fetch-reporting-periods.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(fetchReportingPeriods, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const idToken = 'test-token'

  const mockResponse = {
    cadence: 'monthly',
    reportingPeriods: [
      {
        year: 2026,
        period: 1,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        dueDate: '2026-02-20',
        report: null
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with correct path and options', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await fetchReportingPeriods(organisationId, registrationId, idToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/calendar',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await fetchReportingPeriods('org/123', 'reg&456', idToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/reports/calendar',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    const result = await fetchReportingPeriods(
      organisationId,
      registrationId,
      idToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(
      fetchReportingPeriods(organisationId, registrationId, idToken)
    ).rejects.toThrow('Network error')
  })
})
