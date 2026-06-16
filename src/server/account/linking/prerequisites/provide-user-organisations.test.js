import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { provideUserOrganisations } from './provide-user-organisations.js'

const backendUrl = config.get('eprBackendUrl')

describe(provideUserOrganisations, () => {
  it('should fetch and return organisations when session exists', async ({
    msw
  }) => {
    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Test Organisation'
      },
      linked: null,
      unlinked: []
    }

    msw.use(
      http.get(`${backendUrl}/v1/me/organisations`, ({ request }) => {
        const authHeader = request.headers.get('Authorization')

        if (authHeader === 'Bearer mock-id-token') {
          return HttpResponse.json({ organisations: mockOrganisations })
        }

        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      })
    )

    const mockRequest = {
      auth: {
        credentials: { idToken: 'mock-id-token' }
      }
    }

    const result = await provideUserOrganisations.method(mockRequest)

    expect(result).toStrictEqual(mockOrganisations)
  })

  it('should return null when credentials is null', async () => {
    const mockRequest = {
      auth: {
        credentials: null
      }
    }

    const result = await provideUserOrganisations.method(mockRequest)

    expect(result).toBeNull()
  })

  it('should throw error when backend returns 401 unauthorized', async ({
    msw
  }) => {
    msw.use(
      http.get(`${backendUrl}/v1/me/organisations`, () => {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      })
    )

    const mockRequest = {
      auth: {
        credentials: { idToken: 'invalid-token' }
      }
    }

    await expect(provideUserOrganisations.method(mockRequest)).rejects.toThrow(
      '401 Unauthorized'
    )
  })

  it('should throw error when backend returns 500 server error', async ({
    msw
  }) => {
    msw.use(
      http.get(`${backendUrl}/v1/me/organisations`, () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        )
      })
    )

    const mockRequest = {
      auth: {
        credentials: { idToken: 'mock-id-token' }
      }
    }

    await expect(provideUserOrganisations.method(mockRequest)).rejects.toThrow(
      '500 Internal Server Error'
    )
  })

  it('should have userOrganisations as assign property', () => {
    expect(provideUserOrganisations.assign).toBe('userOrganisations')
  })
})
