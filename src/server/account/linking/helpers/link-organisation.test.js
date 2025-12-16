import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { linkOrganisation } from './link-organisation.js'

/**
 * Creates a mock Hapi request object
 * @param {object} [options]
 * @param {string} [options.token] - Auth token to include in credentials
 * @returns {object} Mock request object
 */
const createMockRequest = (options = {}) => ({
  auth: {
    credentials: options.token ? { token: options.token } : undefined
  }
})

describe(linkOrganisation, () => {
  const backendUrl = config.get('eprBackendUrl')
  const mockBackendServer = setupServer()

  beforeAll(() => {
    mockBackendServer.listen()
  })

  afterEach(() => {
    mockBackendServer.resetHandlers()
  })

  afterAll(() => {
    mockBackendServer.close()
  })

  it('should successfully link organisation with correct auth token', async () => {
    const organisationId = 'org-123'
    const token = 'valid-token'
    const mockRequest = createMockRequest({ token })

    mockBackendServer.use(
      http.post(
        `${backendUrl}/v1/organisations/${organisationId}/link`,
        ({ request }) => {
          const authHeader = request.headers.get('Authorization')

          if (authHeader === `Bearer ${token}`) {
            return HttpResponse.json({})
          }

          return HttpResponse.json({ error: 'Unauthorised' }, { status: 401 })
        }
      )
    )

    await expect(
      linkOrganisation(mockRequest, organisationId)
    ).resolves.toBeUndefined()
  })

  it('should throw error when backend returns 401', async () => {
    const organisationId = 'org-456'
    const mockRequest = createMockRequest({ token: 'invalid-token' })

    mockBackendServer.use(
      http.post(`${backendUrl}/v1/organisations/${organisationId}/link`, () => {
        return HttpResponse.json({ error: 'Unauthorised' }, { status: 401 })
      })
    )

    await expect(
      linkOrganisation(mockRequest, organisationId)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 401
      }
    })
  })

  it('should throw error when backend returns 404', async () => {
    const organisationId = 'non-existent-org'
    const mockRequest = createMockRequest({ token: 'valid-token' })

    mockBackendServer.use(
      http.post(`${backendUrl}/v1/organisations/${organisationId}/link`, () => {
        return HttpResponse.json(
          { error: 'Organisation not found' },
          { status: 404 }
        )
      })
    )

    await expect(
      linkOrganisation(mockRequest, organisationId)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 404
      }
    })
  })

  it('should throw error when backend returns 500', async () => {
    const organisationId = 'org-789'
    const mockRequest = createMockRequest({ token: 'valid-token' })

    mockBackendServer.use(
      http.post(`${backendUrl}/v1/organisations/${organisationId}/link`, () => {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      })
    )

    await expect(
      linkOrganisation(mockRequest, organisationId)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 500
      }
    })
  })
})
