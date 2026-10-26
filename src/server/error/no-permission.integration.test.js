import { config } from '#config/config.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
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
    },
    linkedOrganisationNumber: toOrganisationNumber('500123')
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

  describe.for([
    { prefix: '', lang: 'en' },
    { prefix: '/cy', lang: 'cy' }
  ])('an operator at $prefix/regulators/home', ({ prefix, lang }) => {
    /** @param {ServerFixtures['server']} server */
    const refuse = (server) =>
      server.inject({
        method: 'GET',
        url: `${prefix}/regulators/home`,
        auth: operator
      })

    it(`is refused in lang="${lang}"`, async ({ server }) => {
      const response = await refuse(server)

      expect(response.statusCode).toBe(statusCodes.forbidden)

      const $ = load(asHtml(response.result))
      expect($('html').attr('lang')).toBe(lang)
      expect($('h1').text().trim()).toBe('You do not have permission')
    })

    it('keeps the operator shell, because the role picks the shell and the route never does', async ({
      server
    }) => {
      const $ = load(asHtml((await refuse(server)).result))

      const serviceName = $('.govuk-service-navigation__service-name a')
      expect(serviceName.text().trim()).toBe(
        'Record reprocessed or exported packaging waste'
      )
      expect(serviceName.attr('href')).toBe(`${prefix}/start`)

      const navigation = $('.govuk-service-navigation__item')
      expect(
        navigation.map((_, item) => $(item).text().trim()).get()
      ).toStrictEqual(['Home', 'Manage account', 'Sign out'])
      expect(navigation.last().find('a').attr('href')).toBe(`${prefix}/logout`)
    })
  })
})

/**
 * @import { ServerFixtures } from '#vite/fixtures/server.js'
 */
