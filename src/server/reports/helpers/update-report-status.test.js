import { describe, it, expect, vi, beforeEach } from 'vitest'

import { updateReportStatus } from './update-report-status.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(updateReportStatus, () => {
  const keys = {
    organisationNumber: '500001',
    registrationNumber: 'R25SR500030912PA',
    year: 2026,
    cadence: /** @type {const} */ ('quarterly'),
    period: 1,
    submissionNumber: 1
  }
  const backendToken = 'test-token'

  const mockResponse = { ok: true }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to the registered-only status route for a quarterly report', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await updateReportStatus(
      keys,
      { status: 'ready_to_submit', version: 1 },
      backendToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/reports/2026/quarterly/1/submissions/1/status',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ status: 'ready_to_submit', version: 1 })
      }
    )
  })

  it('posts to the accredited status route for a monthly report', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await updateReportStatus(
      { ...keys, cadence: 'monthly' },
      { status: 'ready_to_submit', version: 1 },
      backendToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/1/submissions/1/status',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    const result = await updateReportStatus(
      keys,
      { status: 'ready_to_submit', version: 1 },
      backendToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(error)

    await expect(
      updateReportStatus(
        keys,
        { status: 'ready_to_submit', version: 1 },
        backendToken
      )
    ).rejects.toThrow('Network error')
  })
})
