import { config } from '#config/config.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * The page has no route of its own. It is rendered in place by `catchAll` on
 * the request that was refused, so every case here drives a real refusal by
 * asking for a regulators page the session may not have.
 */
describe('the no-permission page', () => {
  const roleless = buildMockAuth({
    provider: OIDC_ENTRA_ID,
    profile: {
      id: 'entra-user-2',
      email: 'regulator@example.com'
    }
  })

  const operator = buildMockAuth({
    provider: OIDC_DEFRA_ID,
    profile: {
      id: 'defra-user-2',
      email: 'operator@example.com'
    }
  })

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
      url: '/regulators/home',
      auth: roleless
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)

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
      url: '/regulators/home',
      auth: roleless
    })

    const $ = load(asHtml(response.result))
    const navigation = $('.govuk-service-navigation').text()

    expect(navigation).toContain('Sign out')
    expect(navigation).not.toContain('Manage account')
  })

  it('reads the same to an operator refused a regulators page', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/regulators/home',
      auth: operator
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)

    const $ = load(asHtml(response.result))
    expect($('h1').text().trim()).toBe('You do not have permission')
    expect($('.govuk-service-navigation').text()).toContain('Manage account')
  })
})
