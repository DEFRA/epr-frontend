import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { bearerAuthHandler } from '#server/common/test-helpers/bearer-auth-helper.js'
import { mergeCookies } from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import Iron from '@hapi/iron'
import { getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

const backendUrl = config.get('eprBackendUrl')
const url = '/account/linking'
const organisationId = 'org-1'

const mockAuth = buildMockAuth()

const userOrganisations = {
  current: { id: 'defra-org-123', name: 'My Defra Organisation' },
  linked: null,
  unlinked: [
    { id: organisationId, name: 'Test Company Ltd', orgId: '12345678' }
  ]
}

// Authorises on the session idToken, so a 200 also proves the handler forwards
// the bearer token to the backend link endpoint.
const linkSucceeds = () =>
  bearerAuthHandler(
    'post',
    `${backendUrl}/v1/organisations/${organisationId}/link`,
    'mock-id-token',
    () => HttpResponse.json({})
  )

describe('account linking POST controller', () => {
  beforeEach(({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/v1/me/organisations`, () =>
        HttpResponse.json({ organisations: userOrganisations })
      )
    )
  })

  it('should reject a POST without a CSRF token', async ({ server }) => {
    const { statusCode } = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      payload: { organisationId }
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })

  it('should link the organisation and redirect to its dashboard', async ({
    server,
    msw
  }) => {
    msw.use(linkSucceeds())

    const { cookie, crumb } = await getCsrfToken(server, url, {
      auth: mockAuth
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { organisationId, crumb }
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`/organisations/${organisationId}`)
  })

  it('should store the linked organisation on the session when signed in', async ({
    server,
    msw
  }) => {
    msw.use(linkSucceeds())

    const sessionId = 'mock-session-id'
    const sealedSession = await Iron.seal(
      { sessionId },
      config.get('session.cookie.password'),
      Iron.defaults
    )
    const { cookie, crumb } = await getCsrfToken(server, url, {
      auth: mockAuth
    })

    const { statusCode } = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie: mergeCookies(cookie, `userSession=${sealedSession}`) },
      payload: { organisationId, crumb }
    })

    expect(statusCode).toBe(statusCodes.found)

    const cached = await server.app.cache.get(sessionId)

    expect(cached?.linkedOrganisationId).toBe(organisationId)
  })

  it('should re-render with an error when no organisation is selected', async ({
    server
  }) => {
    const { cookie, crumb } = await getCsrfToken(server, url, {
      auth: mockAuth
    })

    const { statusCode, result } = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: { crumb }
    })

    expect(statusCode).toBe(statusCodes.ok)

    const { body } = new JSDOM(result).window.document
    const main = getByRole(body, 'main')

    expect(
      getByRole(main, 'link', { name: 'Select an organisation to link' })
    ).toBeDefined()
  })
})
