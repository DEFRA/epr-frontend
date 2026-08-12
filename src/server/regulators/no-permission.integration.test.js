import { config } from '#config/config.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect } from 'vitest'

describe('/regulators/no-permission - GET integration', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('states only that the user lacks permission, not why', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/no-permission',
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        profile: {
          id: 'entra-user-2',
          email: 'regulator@example.com'
        }
      })
    })

    expect(response.statusCode).toBe(statusCodes.ok)

    const $ = load(asHtml(response.result))
    expect($('h1').text().trim()).toBe('You do not have permission')
    expect($('[data-testid="app-page-body"] p').text().trim()).toBe(
      'You cannot use the page you asked for. If you think you should have access, contact us using the details at the bottom of this page.'
    )
  })

  it('offers no Defra ID account link to a user signed in with Entra ID', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/no-permission',
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        profile: {
          id: 'entra-user-2',
          email: 'regulator@example.com'
        }
      })
    })

    const $ = load(asHtml(response.result))
    const navigation = $('.govuk-service-navigation').text()

    expect(navigation).toContain('Sign out')
    expect(navigation).not.toContain('Manage account')
  })

  it('returns a 403 rather than the page for a user authenticated with Defra ID', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/no-permission',
      auth: buildMockAuth({
        provider: OIDC_DEFRA_ID,
        profile: {
          id: 'defra-user-2',
          email: 'defra.user@example.com'
        }
      })
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })
})
