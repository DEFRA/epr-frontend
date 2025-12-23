import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchOrganisationById } from './fetch-organisation-by-id.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(fetchOrganisationById, () => {
  const organisationId = 'org-123'
  const idToken = 'test-id-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns organisation data when backend responds successfully', async () => {
    const mockOrganisationData = {
      orgId: organisationId,
      companyDetails: {
        tradingName: 'Test Company'
      },
      accreditations: [],
      registrations: []
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockOrganisationData)
    })

    const result = await fetchOrganisationById(organisationId, idToken)

    expect(result).toStrictEqual(mockOrganisationData)
  })

  test('calls backend with correct path including organisation ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchOrganisationById(organisationId, idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/v1\/organisations\/org-123$/),
      expect.any(Object)
    )
  })

  test('includes Authorization header with Bearer token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchOrganisationById(organisationId, idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-id-token'
        }
      })
    )
  })

  test('throws Boom notFound error when backend returns 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map()
    })

    await expect(
      fetchOrganisationById(organisationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  test('throws Boom error when backend returns 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      fetchOrganisationById(organisationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
