import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getRegistrationWithAccreditation } from './get-registration-with-accreditation.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(getRegistrationWithAccreditation, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const idToken = 'test-id-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns organisation data, registration and accreditation when all exist', async () => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [{ id: registrationId, accreditationId }],
      accreditations: [
        { id: accreditationId, accreditationNumber: 'ACC-2025-001' }
      ]
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOrganisationData)
    })

    const result = await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId, accreditationId },
      accreditation: {
        id: accreditationId,
        accreditationNumber: 'ACC-2025-001'
      }
    })
  })

  test('returns undefined registration when registration not found', async () => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [{ id: 'other-reg', accreditationId }],
      accreditations: [
        { id: accreditationId, accreditationNumber: 'ACC-2025-001' }
      ]
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOrganisationData)
    })

    const result = await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: undefined,
      accreditation: undefined
    })
  })

  test('returns undefined accreditation when registration has no accreditationId', async () => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [{ id: registrationId }],
      accreditations: [
        { id: accreditationId, accreditationNumber: 'ACC-2025-001' }
      ]
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOrganisationData)
    })

    const result = await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId },
      accreditation: undefined
    })
  })

  test('returns undefined accreditation when accreditation not found', async () => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [
        { id: registrationId, accreditationId: 'non-existent-acc' }
      ],
      accreditations: [
        { id: accreditationId, accreditationNumber: 'ACC-2025-001' }
      ]
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOrganisationData)
    })

    const result = await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId, accreditationId: 'non-existent-acc' },
      accreditation: undefined
    })
  })

  test('handles organisation with empty registrations array', async () => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [],
      accreditations: []
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOrganisationData)
    })

    const result = await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: undefined,
      accreditation: undefined
    })
  })

  test('handles organisation with missing registrations property', async () => {
    const mockOrganisationData = {
      id: organisationId
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOrganisationData)
    })

    const result = await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: undefined,
      accreditation: undefined
    })
  })

  test('passes correct parameters to fetchOrganisationById', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: organisationId })
    })

    await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      idToken
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/v1\/organisations\/org-123$/),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-id-token'
        })
      })
    )
  })

  test('propagates errors from fetchOrganisationById', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map()
    })

    await expect(
      getRegistrationWithAccreditation(organisationId, registrationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })
})
