import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createPrn } from './create-prn.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(createPrn, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const idToken = 'test-token'

  const payload = {
    issuedToOrganisation: 'producer-1',
    tonnage: 100,
    material: 'plastic',
    nation: 'england',
    wasteProcessingType: 'reprocessor',
    issuerNotes: 'Test notes'
  }

  const mockResponse = {
    id: 'prn-789',
    tonnage: 100,
    material: 'plastic',
    issuedToOrganisation: 'producer-1',
    status: 'draft',
    createdAt: '2026-01-27T12:00:00.000Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with correct path and options', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await createPrn(organisationId, registrationId, payload, idToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes`,
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

    const result = await createPrn(
      organisationId,
      registrationId,
      payload,
      idToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(
      createPrn(organisationId, registrationId, payload, idToken)
    ).rejects.toThrowError('Network error')
  })
})
