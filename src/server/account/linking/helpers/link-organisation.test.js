import { config } from '#config/config.js'
import { bearerAuthHandler } from '#server/common/test-helpers/bearer-auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { linkOrganisation } from './link-organisation.js'

describe(linkOrganisation, () => {
  const backendUrl = config.get('eprBackendUrl')

  it('should successfully link organisation with correct auth token', async ({
    msw
  }) => {
    const organisationNumber = 'org-123'
    const backendToken = 'valid-id-token'

    msw.use(
      bearerAuthHandler(
        'post',
        `${backendUrl}/organisations/${organisationNumber}/link`,
        backendToken,
        () => HttpResponse.json({})
      )
    )

    await expect(
      linkOrganisation(backendToken, organisationNumber)
    ).resolves.toBeUndefined()
  })

  it('should throw error when backend returns 401', async ({ msw }) => {
    const organisationNumber = 'org-456'
    const backendToken = 'invalid-token'

    msw.use(
      http.post(
        `${backendUrl}/organisations/${organisationNumber}/link`,
        () => {
          return HttpResponse.json({ error: 'Unauthorised' }, { status: 401 })
        }
      )
    )

    await expect(
      linkOrganisation(backendToken, organisationNumber)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 401
      }
    })
  })

  it('should throw error when backend returns 404', async ({ msw }) => {
    const organisationNumber = 'non-existent-org'
    const backendToken = 'valid-token'

    msw.use(
      http.post(
        `${backendUrl}/organisations/${organisationNumber}/link`,
        () => {
          return HttpResponse.json(
            { error: 'Organisation not found' },
            { status: 404 }
          )
        }
      )
    )

    await expect(
      linkOrganisation(backendToken, organisationNumber)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 404
      }
    })
  })

  it('should throw error when backend returns 500', async ({ msw }) => {
    const organisationNumber = 'org-789'
    const backendToken = 'valid-token'

    msw.use(
      http.post(
        `${backendUrl}/organisations/${organisationNumber}/link`,
        () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        }
      )
    )

    await expect(
      linkOrganisation(backendToken, organisationNumber)
    ).rejects.toMatchObject({
      isBoom: true,
      output: {
        statusCode: 500
      }
    })
  })
})
