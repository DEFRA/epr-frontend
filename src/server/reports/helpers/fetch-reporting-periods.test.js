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
  const backendToken = 'test-token'

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
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await fetchReportingPeriods(organisationId, registrationId, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/calendar',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await fetchReportingPeriods('org/123', 'reg&456', backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/reports/calendar',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    const result = await fetchReportingPeriods(
      organisationId,
      registrationId,
      backendToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(error)

    await expect(
      fetchReportingPeriods(organisationId, registrationId, backendToken)
    ).rejects.toThrow('Network error')
  })

  // A caller reading a period that has closed names the year and cadence it
  // wants, rather than taking the one the registration owes today.
  it('asks for a named year and cadence', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await fetchReportingPeriods(organisationId, registrationId, backendToken, {
      year: 2025,
      cadence: 'quarterly'
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/calendar?year=2025&cadence=quarterly',
      expect.any(Object)
    )
  })

  it('asks for a year alone', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await fetchReportingPeriods(organisationId, registrationId, backendToken, {
      year: 2025
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/calendar?year=2025',
      expect.any(Object)
    )
  })

  it('asks for a cadence alone', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await fetchReportingPeriods(organisationId, registrationId, backendToken, {
      cadence: 'quarterly'
    })

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/calendar?cadence=quarterly',
      expect.any(Object)
    )
  })
})
