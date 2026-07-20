import { describe, it, expect, vi, beforeEach } from 'vitest'

import { requestResubmission } from './request-resubmission.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(requestResubmission, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const year = 2026
  const cadence = 'quarterly'
  const period = 1
  const submissionNumber = 1
  const idToken = 'test-token'

  const mockResponse = { status: 'requires_resubmission' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with POST to the request-resubmission endpoint', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await requestResubmission(
      {
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        submissionNumber
      },
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/reports/2026/quarterly/1/submissions/1/request-resubmission',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token'
        }
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    await requestResubmission(
      {
        organisationId: 'org/123',
        registrationId: 'reg&456',
        year,
        cadence,
        period,
        submissionNumber
      },
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/reports/2026/quarterly/1/submissions/1/request-resubmission',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(mockResponse)

    const result = await requestResubmission(
      {
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        submissionNumber
      },
      idToken
    )

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

    await expect(
      requestResubmission(
        {
          organisationId,
          registrationId,
          year,
          cadence,
          period,
          submissionNumber
        },
        idToken
      )
    ).rejects.toThrow('Conflict')
  })
})
