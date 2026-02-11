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
  const accreditationId = 'acc-789'
  const idToken = 'test-token'

  const payload = {
    issuedToOrganisation: {
      id: 'producer-1',
      name: 'Acme Packaging Ltd'
    },
    tonnage: 100,
    material: 'plastic',
    notes: 'Test notes'
  }

  const mockResponse = {
    id: 'prn-789',
    tonnage: 100,
    material: 'plastic',
    issuedToOrganisation: {
      id: 'producer-1',
      name: 'Acme Packaging Ltd'
    },
    status: 'draft',
    createdAt: '2026-01-27T12:00:00.000Z',
    wasteProcessingType: 'reprocessor',
    processToBeUsed: 'R3',
    isDecemberWaste: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls fetchJsonFromBackend with correct path and options', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await createPrn(
      organisationId,
      registrationId,
      accreditationId,
      payload,
      idToken
    )

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org-123/registrations/reg-456/accreditations/acc-789/packaging-recycling-notes',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      }
    )
  })

  it('encodes URL path parameters with special characters', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await createPrn('org/123', 'reg&456', 'acc#789', payload, idToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/v1/organisations/org%2F123/registrations/reg%26456/accreditations/acc%23789/packaging-recycling-notes',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    const result = await createPrn(
      organisationId,
      registrationId,
      accreditationId,
      payload,
      idToken
    )

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(
      createPrn(
        organisationId,
        registrationId,
        accreditationId,
        payload,
        idToken
      )
    ).rejects.toThrowError('Network error')
  })
})
