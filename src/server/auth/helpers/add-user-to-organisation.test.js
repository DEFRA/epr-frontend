import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { addUserToOrganisation } from './add-user-to-organisation.js'

describe('#addUserToOrganisation', () => {
  const backendUrl = config.get('eprBackendUrl')
  const mockIdToken = 'mock-id-token-12345'
  const organisationId = 'org-123'

  const mockServer = setupServer(
    http.put(
      `${backendUrl}/v1/organisations/${organisationId}/user`,
      ({ request }) => {
        const authHeader = request.headers.get('Authorization')

        if (authHeader === `Bearer ${mockIdToken}`) {
          return new HttpResponse(null, { status: 200 })
        }

        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    )
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

  it('should add user to organisation successfully with valid token', async () => {
    await expect(
      addUserToOrganisation(organisationId, mockIdToken)
    ).resolves.not.toThrow()
  })

  it('should throw error when backend returns 401', async () => {
    await expect(
      addUserToOrganisation(organisationId, 'invalid-token')
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 401
      }
    })
  })

  it('should throw error when backend returns 500', async () => {
    mockServer.use(
      http.put(`${backendUrl}/v1/organisations/${organisationId}/user`, () =>
        HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
      )
    )

    await expect(
      addUserToOrganisation(organisationId, mockIdToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 500
      }
    })
  })

  it('should throw error when network request fails', async () => {
    mockServer.use(
      http.put(`${backendUrl}/v1/organisations/${organisationId}/user`, () =>
        HttpResponse.error()
      )
    )

    await expect(
      addUserToOrganisation(organisationId, mockIdToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 500
      }
    })
  })
})
