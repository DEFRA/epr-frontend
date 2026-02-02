import { describe, it, expect, vi, beforeEach } from 'vitest'

import { updatePrnStatus } from './update-prn-status.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(updatePrnStatus, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const prnId = 'prn-789'
  const idToken = 'test-token'

  const payload = {
    status: 'awaiting_authorisation'
  }

  const mockResponse = {
    id: 'prn-789',
    prnNumber: 'PRN-2026-001',
    tonnage: 100,
    material: 'plastic',
    issuedToOrganisation: 'producer-org',
    status: 'awaiting_authorisation',
    updatedAt: '2026-01-28T12:00:00.000Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with correct path and options', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await updatePrnStatus(
      organisationId,
      registrationId,
      prnId,
      payload,
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/l-packaging-recycling-notes/${prnId}/status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      }
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    const result = await updatePrnStatus(
      organisationId,
      registrationId,
      prnId,
      payload,
      idToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(
      updatePrnStatus(organisationId, registrationId, prnId, payload, idToken)
    ).rejects.toThrowError('Network error')
  })
})
