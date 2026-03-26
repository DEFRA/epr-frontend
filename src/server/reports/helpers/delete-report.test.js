import { describe, it, expect, vi, beforeEach } from 'vitest'

import { deleteReport } from './delete-report.js'

vi.mock(import('#server/common/helpers/delete-from-backend.js'), () => ({
  deleteFromBackend: vi.fn()
}))

const { deleteFromBackend } =
  await import('#server/common/helpers/delete-from-backend.js')

describe(deleteReport, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const year = 2026
  const cadence = 'monthly'
  const period = 1
  const idToken = 'test-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls deleteFromBackend with correct path and auth header', async () => {
    deleteFromBackend.mockResolvedValue(undefined)

    await deleteReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      idToken
    )

    expect(deleteFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/2026/monthly/1',
      {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    deleteFromBackend.mockResolvedValue(undefined)

    await deleteReport('org/123', 'reg&456', year, 'quarterly', period, idToken)

    expect(deleteFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/reports/2026/quarterly/1',
      expect.any(Object)
    )
  })

  it('propagates errors from deleteFromBackend', async () => {
    const error = new Error('Network error')
    deleteFromBackend.mockRejectedValue(error)

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
