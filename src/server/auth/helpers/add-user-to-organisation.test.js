import { config } from '#config/config.js'
import { bearerAuthHandler } from '#server/common/test-helpers/bearer-auth-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { addUserToOrganisation } from './add-user-to-organisation.js'

describe('#addUserToOrganisation', () => {
  const backendUrl = config.get('eprBackendUrl')
  const mockIdToken = 'mock-id-token-12345'
  const organisationId = 'org-123'
  const userEndpoint = `${backendUrl}/v1/organisations/${organisationId}/user`

  beforeEach(({ msw }) => {
    msw.use(
      bearerAuthHandler(
        'put',
        userEndpoint,
        mockIdToken,
        () => new HttpResponse(null, { status: 200 })
      )
    )
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

  it('should throw error when backend returns 500', async ({ msw }) => {
    msw.use(
      http.put(userEndpoint, () =>
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

  it('should throw error when network request fails', async ({ msw }) => {
    msw.use(http.put(userEndpoint, () => HttpResponse.error()))

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
