import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { provideUserOrganisations } from './provide-user-organisations.js'

const backendUrl = config.get('eprBackendUrl')
const mockBackendServer = setupServer()

describe(provideUserOrganisations, () => {
  beforeAll(() => {
    mockBackendServer.listen()
  })

  afterEach(() => {
    mockBackendServer.resetHandlers()
  })

  afterAll(() => {
    mockBackendServer.close()
  })

  it('should fetch and return organisations when session exists', async () => {
    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Test Organisation'
      },
      linked: null,
      unlinked: []
    }

    mockBackendServer.use(
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

  it('should throw error when backend returns 401 unauthorized', async () => {
    mockBackendServer.use(
      http.get(`${backendUrl}/v1/me/organisations`, () => {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      })
    )

    const mockRequest = {
      auth: {
        credentials: { idToken: 'invalid-token' }
      }
    }

    await expect(
      provideUserOrganisations.method(mockRequest)
    ).rejects.toThrowError('401 Unauthorized')
  })

  it('should throw error when backend returns 500 server error', async () => {
    mockBackendServer.use(
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

    await expect(
      provideUserOrganisations.method(mockRequest)
    ).rejects.toThrowError('500 Internal Server Error')
  })

  it('should have userOrganisations as assign property', () => {
    expect(provideUserOrganisations.assign).toBe('userOrganisations')
  })
})
