import { describe, it, expect, vi, beforeEach } from 'vitest'

import { updateReport } from './update-report.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(updateReport, () => {
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

  it('calls fetchJsonFromBackend with correct path and options for supporting information', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { supportingInformation: 'Supply chain disruption in February' },
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/2026/quarterly/1',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({
          supportingInformation: 'Supply chain disruption in February'
        })
      }
    )
  })

  it('calls fetchJsonFromBackend with correct path and options for status update', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { status: 'ready_to_submit' },
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/2026/quarterly/1',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ status: 'ready_to_submit' })
      }
    )
  })

  it('sends empty string for supporting information when blank', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { supportingInformation: '' },
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ supportingInformation: '' })
      })
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await updateReport(
      'org/123',
      'reg&456',
      year,
      cadence,
      period,
      { supportingInformation: 'notes' },
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/reports/2026/quarterly/1',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    const result = await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { supportingInformation: 'notes' },
      idToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(
      updateReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        { supportingInformation: 'notes' },
        idToken
      )
    ).rejects.toThrow('Network error')
  })
})
