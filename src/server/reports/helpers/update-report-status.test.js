import { describe, it, expect, vi, beforeEach } from 'vitest'

import { updateReportStatus } from './update-report-status.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(updateReportStatus, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const year = 2026
  const cadence = 'quarterly'
  const period = 1
  const idToken = 'test-token'

  const mockResponse = { ok: true }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with POST to the status endpoint', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await updateReportStatus(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      'ready_to_submit',
      1,
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/2026/quarterly/1/status',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ status: 'ready_to_submit', version: 1 })
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await updateReportStatus(
      'org/123',
      'reg&456',
      year,
      cadence,
      period,
      'ready_to_submit',
      1,
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/reports/2026/quarterly/1/status',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    const result = await updateReportStatus(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      'ready_to_submit',
      1,
      idToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(
      updateReportStatus(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        'ready_to_submit',
        1,
        idToken
      )
    ).rejects.toThrow('Network error')
  })
})
