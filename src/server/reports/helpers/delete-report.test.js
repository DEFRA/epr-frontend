import { describe, it, expect, vi, beforeEach } from 'vitest'

import { deleteReport } from './delete-report.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(deleteReport, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const year = 2026
  const cadence = 'monthly'
  const period = 1
  const idToken = 'test-token'

  const mockResponse = { ok: true }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with correct path and DELETE method', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await deleteReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/2026/monthly/1',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await deleteReport('org/123', 'reg&456', year, 'quarterly', period, idToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/reports/2026/quarterly/1',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    const result = await deleteReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      idToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(
      deleteReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        idToken
      )
    ).rejects.toThrow('Network error')
  })
})
