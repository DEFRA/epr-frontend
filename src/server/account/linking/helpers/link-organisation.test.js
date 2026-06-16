import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { linkOrganisation } from './link-organisation.js'

describe(linkOrganisation, () => {
  const backendUrl = config.get('eprBackendUrl')

  it('should successfully link organisation with correct auth token', async ({
    msw
  }) => {
    const organisationId = 'org-123'
    const idToken = 'valid-id-token'

    msw.use(
      http.post(
        `${backendUrl}/v1/organisations/${organisationId}/link`,
        ({ request }) => {
          const authHeader = request.headers.get('Authorization')

          if (authHeader === `Bearer ${idToken}`) {
            return HttpResponse.json({})
          }

          return HttpResponse.json({ error: 'Unauthorised' }, { status: 401 })
        }
      )
    )

    await expect(
      linkOrganisation(idToken, organisationId)
    ).resolves.toBeUndefined()
  })

  it('should throw error when backend returns 401', async ({ msw }) => {
    const organisationId = 'org-456'
    const idToken = 'invalid-token'

    msw.use(
      http.post(`${backendUrl}/v1/organisations/${organisationId}/link`, () => {
        return HttpResponse.json({ error: 'Unauthorised' }, { status: 401 })
      })
    )

    await expect(
      linkOrganisation(idToken, organisationId)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 401
      }
    })
  })

  it('should throw error when backend returns 404', async ({ msw }) => {
    const organisationId = 'non-existent-org'
    const idToken = 'valid-token'

    msw.use(
      http.post(`${backendUrl}/v1/organisations/${organisationId}/link`, () => {
        return HttpResponse.json(
          { error: 'Organisation not found' },
          { status: 404 }
        )
      })
    )

    await expect(
      linkOrganisation(idToken, organisationId)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 404
      }
    })
  })

  it('should throw error when backend returns 500', async ({ msw }) => {
    const organisationId = 'org-789'
    const idToken = 'valid-token'

    msw.use(
      http.post(`${backendUrl}/v1/organisations/${organisationId}/link`, () => {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      })
    )

    await expect(
      linkOrganisation(idToken, organisationId)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 500
      }
    })
  })
})
