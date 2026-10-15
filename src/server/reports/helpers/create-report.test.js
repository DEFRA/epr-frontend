import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createReport } from './create-report.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(createReport, () => {
  const keys = {
    organisationNumber: '500001',
    registrationNumber: 'R25SR500030912PA',
    year: 2026,
    cadence: /** @type {const} */ ('monthly'),
    period: 1,
    submissionNumber: 1
  }
  const backendToken = 'test-token'

  const mockResponse = {
    id: 'report-789',
    status: 'in_progress'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to the accredited natural-key route for a monthly report', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await createReport(keys, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/1/submissions/1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  })

  it('posts to the registered-only natural-key route for a quarterly report', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await createReport({ ...keys, cadence: 'quarterly' }, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/reports/2026/quarterly/1/submissions/1',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    const result = await createReport(keys, backendToken)

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(error)

    await expect(createReport(keys, backendToken)).rejects.toThrow(
      'Network error'
    )
  })
})
