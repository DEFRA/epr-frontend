import { config } from '#config/config.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect } from 'vitest'

const mockAuth = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: {
    id: 'entra-user-1',
    email: 'jane.doe@example.com'
  },
  scope: [SCOPES.regulator]
})

describe('/regulators/home - GET integration', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('renders the username derived from the signed in regulator email', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/home',
      auth: mockAuth
    })

    expect(response.statusCode).toBe(statusCodes.ok)

    const $ = load(asHtml(response.result))
    expect($('[data-testid="regulator-username"]').text().trim()).toBe(
      'jane.doe'
    )
  })

  it('redirects unauthenticated requests to sign in', async ({ server }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/home'
    })

    expect(response.statusCode).toBe(statusCodes.found)
  })

  it('redirects authenticated non-regulator users to the no-permission page', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/home',
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        profile: {
          id: 'entra-user-2',
          email: 'no.role@example.com'
        }
      })
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers['location']).toBe('/regulators/no-permission')
  })
})
