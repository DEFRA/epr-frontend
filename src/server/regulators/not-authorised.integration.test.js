import { config } from '#config/config.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect } from 'vitest'

describe('/regulators/not-authorised - GET integration', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('renders the not-authorised content for a signed in non-regulator user', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/not-authorised',
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        profile: {
          id: 'entra-user-2',
          email: 'no.role@example.com'
        }
      })
    })

    expect(response.statusCode).toBe(statusCodes.ok)

    const $ = load(asHtml(response.result))
    expect($('h1').text().trim()).toBe('User not authorised')
  })

  it('returns a 403 rather than the not-authorised page for a user authenticated with Defra ID', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/not-authorised',
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
