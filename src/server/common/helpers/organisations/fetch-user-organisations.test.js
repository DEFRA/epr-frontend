import { config } from '#config/config.js'
import { fetchUserOrganisations } from '#server/common/helpers/organisations/fetch-user-organisations.js'
import fetch from 'node-fetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node-fetch'))

describe('fetchUserOrganisations', () => {
  const mockAccessToken = 'mock-access-token-123'
  const mockBackendUrl = 'http://backend.test'

  beforeEach(() => {
    config.load({
      eprBackendUrl: mockBackendUrl
    })
  })

  afterEach(() => {
    config.reset('eprBackendUrl')
    vi.clearAllMocks()
  })

  it('should fetch organisations successfully', async () => {
    const mockOrganisations = {
      organisations: {
        linked: [
          {
            id: 'org-1',
            orgId: 'org-id-1',
            linkedDefraOrganisation: { name: 'Linked Org' },
            users: []
          }
        ],
        unlinked: [
          {
            id: 'org-2',
            orgId: 'org-id-2',
            users: []
          }
        ]
      }
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue(mockOrganisations)
    })

    const fetchOrgs = fetchUserOrganisations()
    const result = await fetchOrgs(mockAccessToken)

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `${mockBackendUrl}/v1/me/organisations`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`
        }
      }
    )

    expect(result).toStrictEqual(mockOrganisations)
  })

  it('should throw error when backend returns non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    const fetchOrgs = fetchUserOrganisations()

    await expect(fetchOrgs(mockAccessToken)).rejects.toThrow(
      'Backend returned 401: Unauthorized'
    )

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `${mockBackendUrl}/v1/me/organisations`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`
        }
      }
    )
  })

  it('should include status code in thrown error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    const fetchOrgs = fetchUserOrganisations()

    try {
      await fetchOrgs(mockAccessToken)
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error.status).toBe(500)
      expect(error.message).toBe('Backend returned 500: Internal Server Error')
    }
  })

  it('should handle 404 not found response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    const fetchOrgs = fetchUserOrganisations()

    await expect(fetchOrgs(mockAccessToken)).rejects.toThrow(
      'Backend returned 404: Not Found'
    )
  })
})

/**
 * @import { UserOrganisations } from '#server/common/helpers/organisations/fetch-user-organisations.js'
 */
