import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { paths } from '#server/paths.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

const backendUrl = config.get('eprBackendUrl')
const organisationId = 'org-1'
const linkingUrl = '/account/linking'

const regulatorAuth = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'jane.doe@example.com' },
  role: 'regulator_standard',
  scope: ['organisation.read', SCOPES.regulator]
})

const grantedNothingAuth = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'john.doe@example.com' },
  role: null,
  scope: []
})

const operatorAuth = buildMockAuth()

describe('write guard', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/v1/me/organisations`, () =>
        HttpResponse.json({
          organisations: {
            current: { id: 'defra-org-123', name: 'My Defra Organisation' },
            linked: null,
            unlinked: [
              {
                id: organisationId,
                name: 'Test Company Ltd',
                orgId: '12345678'
              }
            ]
          }
        })
      )
    )
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('sends a regulator posting to an operator route to the not-authorised page', async ({
    server
  }) => {
    const { cookie, crumb } = await getCsrfToken(
      server,
      paths.regulators.home,
      {
        auth: regulatorAuth
      }
    )

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: linkingUrl,
      auth: regulatorAuth,
      headers: { cookie },
      payload: { organisationId, crumb }
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(paths.regulators.notAuthorised)
  })

  it('leaves an operator posting to the same route unaffected', async ({
    server,
    msw
  }) => {
    msw.use(
      http.post(`${backendUrl}/v1/organisations/${organisationId}/link`, () =>
        HttpResponse.json({})
      )
    )

    const { cookie, crumb } = await getCsrfToken(server, '/cookies', {
      auth: operatorAuth
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: linkingUrl,
      auth: operatorAuth,
      headers: { cookie },
      payload: { organisationId, crumb }
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`/organisations/${organisationId}`)
  })

  it('sends a session the backend granted nothing to the not-authorised page', async ({
    server
  }) => {
    const { cookie, crumb } = await getCsrfToken(server, '/cookies', {
      auth: grantedNothingAuth
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: linkingUrl,
      auth: grantedNothingAuth,
      headers: { cookie },
      payload: { organisationId, crumb }
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(paths.regulators.notAuthorised)
  })

  it('shows a session the backend granted nothing no write controls', async ({
    server
  }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: linkingUrl,
      auth: grantedNothingAuth
    })

    expect(load(asHtml(result))('main form')).toHaveLength(0)
  })

  it('shows an operator the write controls on an operator page', async ({
    server
  }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: linkingUrl,
      auth: operatorAuth
    })

    expect(load(asHtml(result))('main form')).toHaveLength(1)
  })

  it('shows a regulator no write controls on the same page', async ({
    server
  }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: linkingUrl,
      auth: regulatorAuth
    })

    expect(load(asHtml(result))('main form')).toHaveLength(0)
  })

  it.for([
    paths.regulators.notAuthorised,
    paths.regulators.home,
    paths.loggedOut,
    paths.auth.defraId.login,
    paths.auth.entraId.login,
    '/',
    '/cookies',
    '/contact'
  ])('leaves %s reachable by a regulator', async (url, { server }) => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url,
      auth: regulatorAuth
    })

    expect(statusCode).toBeLessThan(statusCodes.badRequest)
    expect(headers.location).not.toBe(paths.regulators.notAuthorised)
  })
})
