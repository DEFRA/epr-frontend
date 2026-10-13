import { describe, it, expect, vi, beforeEach } from 'vitest'

import { deleteReport } from './delete-report.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(deleteReport, () => {
  const keys = {
    organisationNumber: '500001',
    registrationNumber: 'R25SR500030912PA',
    year: 2026,
    cadence: /** @type {const} */ ('monthly'),
    period: 1,
    submissionNumber: 1
  }
  const backendToken = 'test-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes through the accredited natural-key route for a monthly report', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(undefined)

    await deleteReport(keys, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/1/submissions/1',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  })

  it('deletes through the registered-only natural-key route for a quarterly report', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(undefined)

    await deleteReport({ ...keys, cadence: 'quarterly' }, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/reports/2026/quarterly/1/submissions/1',
      expect.any(Object)
    )
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(error)

    await expect(deleteReport(keys, backendToken)).rejects.toThrow(
      'Network error'
    )
  })
})
