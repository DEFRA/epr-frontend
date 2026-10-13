import { describe, it, expect, vi, beforeEach } from 'vitest'

import { updateReport } from './update-report.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(updateReport, () => {
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

  it('patches a quarterly report through the registered-only natural-key route', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await updateReport(
      keys,
      { supportingInformation: 'Supply chain disruption in February' },
      backendToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/reports/2026/quarterly/1/submissions/1',
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

  it('patches a monthly report through the accredited natural-key route', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await updateReport(
      { ...keys, cadence: 'monthly' },
      { status: 'ready_to_submit' },
      backendToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/1/submissions/1',
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
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await updateReport(keys, { supportingInformation: '' }, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ supportingInformation: '' })
      })
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    const result = await updateReport(
      keys,
      { supportingInformation: 'notes' },
      backendToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(error)

    await expect(
      updateReport(keys, { supportingInformation: 'notes' }, backendToken)
    ).rejects.toThrow('Network error')
  })
})
