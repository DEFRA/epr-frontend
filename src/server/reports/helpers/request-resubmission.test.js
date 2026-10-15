import { describe, it, expect, vi, beforeEach } from 'vitest'

import { requestResubmission } from './request-resubmission.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(requestResubmission, () => {
  const keys = {
    organisationNumber: '500001',
    registrationNumber: 'R25SR500030912PA',
    year: 2026,
    cadence: /** @type {const} */ ('quarterly'),
    period: 1,
    submissionNumber: 1
  }
  const backendToken = 'test-token'

  const mockResponse = { status: 'requires_resubmission' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to the registered-only request-resubmission route for a quarterly report', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await requestResubmission(keys, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/reports/2026/quarterly/1/submissions/1/request-resubmission',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token'
        }
      }
    )
  })

  it('posts to the accredited request-resubmission route for a monthly report', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await requestResubmission({ ...keys, cadence: 'monthly' }, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/1/submissions/1/request-resubmission',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    const result = await requestResubmission(keys, backendToken)

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = Object.assign(new Error('Conflict'), {
      isBoom: true,
      output: {
        statusCode: 409,
        payload: { code: 'resubmission_already_requested' }
      }
    })
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(error)

    await expect(requestResubmission(keys, backendToken)).rejects.toThrow(
      'Conflict'
    )
  })
})
