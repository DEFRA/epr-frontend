import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { fetchUserOrganisations } from './fetch-user-organisations.js'

/**
 * @import { UserOrganisations } from '../types/organisations.js'
 */

describe('#fetchUserOrganisations', () => {
  const backendUrl = config.get('eprBackendUrl')
  const mockIdToken = 'mock-id-token-12345'

  const mockOrganisationsResponse = {
    organisations: {
      current: {
        id: 'defra-org-123',
        name: 'Test Defra Organisation',
        relationshipId: 'rel-456'
      },
      linked: {
        id: 'epr-org-789',
        name: 'Test EPR Organisation',
        linkedBy: {
          email: 'admin@example.com',
          id: 'admin-123'
        },
        linkedAt: '2025-12-10T10:00:00.000Z'
      },
      unlinked: [
        {
          id: 'unlinked-1',
          name: 'Unlinked Company A',
          orgId: '11111111'
        },
        {
          id: 'unlinked-2',
          name: 'Unlinked Company B',
          orgId: '22222222'
        }
      ]
    }
  }

  const mockServer = setupServer(
    http.get(`${backendUrl}/v1/me/organisations`, ({ request }) => {
      const authHeader = request.headers.get('Authorization')

      if (authHeader === `Bearer ${mockIdToken}`) {
        return HttpResponse.json(mockOrganisationsResponse)
      }

      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    })
  )

  beforeAll(() => {
    mockServer.listen()
  })

  afterEach(() => {
    mockServer.resetHandlers()
  })

  afterAll(() => {
    mockServer.close()
  })

  it('should fetch user organisations successfully with valid token', async () => {
    const result = await fetchUserOrganisations(mockIdToken)

    expect(result).toStrictEqual(mockOrganisationsResponse.organisations)
  })

  it('should handle organisations with linked organisation', async () => {
    const result = await fetchUserOrganisations(mockIdToken)

    expect(result.current).toStrictEqual({
      id: 'defra-org-123',
      name: 'Test Defra Organisation',
      relationshipId: 'rel-456'
    })

    expect(result.linked).toStrictEqual({
      id: 'epr-org-789',
      name: 'Test EPR Organisation',
      linkedBy: {
        email: 'admin@example.com',
        id: 'admin-123'
      },
      linkedAt: '2025-12-10T10:00:00.000Z'
    })
  })

  it('should handle organisations with no linked organisation', async () => {
    mockServer.use(
      http.get(`${backendUrl}/v1/me/organisations`, () => {
        return HttpResponse.json({
          organisations: {
            current: {
              id: 'defra-org-999',
              name: 'Another Defra Org',
              relationshipId: 'rel-999'
            },
            linked: null,
            unlinked: [
              {
                id: 'unlinked-only',
                name: 'Only Unlinked Company',
                orgId: '99999999'
              }
            ]
          }
        })
      })
    )

    const result = await fetchUserOrganisations(mockIdToken)

    expect(result.linked).toBeNull()
    expect(result.unlinked).toHaveLength(1)
  })

  it('should handle empty unlinked organisations array', async () => {
    mockServer.use(
      http.get(`${backendUrl}/v1/me/organisations`, () => {
        return HttpResponse.json({
          organisations: {
            current: {
              id: 'defra-org-linked',
              name: 'Linked Defra Org',
              relationshipId: 'rel-linked'
            },
            linked: {
              id: 'epr-org-linked',
              name: 'Linked EPR Org',
              linkedBy: {
                email: 'user@example.com',
                id: 'user-456'
              },
              linkedAt: '2025-12-09T12:00:00.000Z'
            },
            unlinked: []
          }
        })
      })
    )

    const result = await fetchUserOrganisations(mockIdToken)

    expect(result.unlinked).toStrictEqual([])
    expect(result.linked).not.toBeNull()
  })

  it('should throw error when backend returns 401', async () => {
    await expect(fetchUserOrganisations('invalid-token')).rejects.toMatchObject(
      {
        isBoom: true,
        output: {
          statusCode: 401
        }
      }
    )
  })

  it('should throw error when backend returns 500', async () => {
    mockServer.use(
      http.get(`${backendUrl}/v1/me/organisations`, () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        )
      })
    )

    await expect(fetchUserOrganisations(mockIdToken)).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 500
      }
    })
  })

  it('should throw error when network request fails', async () => {
    mockServer.use(
      http.get(`${backendUrl}/v1/me/organisations`, () => {
        return HttpResponse.error()
      })
    )

    await expect(fetchUserOrganisations(mockIdToken)).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 500
      }
    })
  })
})
