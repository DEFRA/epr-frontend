/** @import { ServerInjectResponse } from '@hapi/hapi'; */
import { config } from '#config/config.js'
import { REGULATOR_ROLE } from '#server/auth/roles.js'
import { SIGNED_OUT_PROVIDER_COOKIE } from '#server/auth/helpers/signed-out-provider.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect } from 'vitest'

const regulatorAuth = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  role: REGULATOR_ROLE,
  scope: [],
  urls: {
    token: 'http://entra-id.auth/token',
    logout: 'http://entra-id.auth/logout'
  }
})

/**
 * The provider cookie as the browser sends it back, taken from the response
 * that set it rather than assembled by hand, so the test proves the value the
 * app writes is the value it later reads.
 * @param {ServerInjectResponse} response
 * @returns {string}
 */
const providerCookieHeader = (response) => {
  const setCookie = /** @type {string[]} */ (response.headers['set-cookie'])
  const cookie = setCookie.find((header) =>
    header.startsWith(`${SIGNED_OUT_PROVIDER_COOKIE}=`)
  )

  return /** @type {string} */ (cookie).split(';')[0]
}

describe('which sign out page a provider sends a user to', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  describe('when a regulator signs out', () => {
    it('sends them to the regulator sign out page', async ({ server }) => {
      const signOut = await server.inject({
        method: 'GET',
        url: '/logout',
        auth: regulatorAuth
      })

      const returned = await server.inject({
        method: 'GET',
        url: '/auth/logout',
        headers: { cookie: providerCookieHeader(signOut) }
      })

      expect(returned.statusCode).toBe(statusCodes.found)
      expect(returned.headers.location).toBe('/regulators/logged-out')
    })

    it('offers them the Entra ID route back in', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/regulators/logged-out'
      })

      const $ = load(asHtml(result))

      expect($('.govuk-button').attr('href')).toBe('/regulators/login')
    })

    it('sends them home again if they are still signed in', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/regulators/logged-out',
        auth: regulatorAuth
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/regulators/home')
    })

    it('does not name the operator service on the way out', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/regulators/logged-out'
      })

      expect(asHtml(result)).not.toContain(
        'Record reprocessed or exported packaging waste'
      )
    })
  })

  describe('when an operator signs out', () => {
    it('sends them to the operator sign out page', async ({ server }) => {
      const signOut = await server.inject({
        method: 'GET',
        url: '/logout',
        auth: buildMockAuth()
      })

      const returned = await server.inject({
        method: 'GET',
        url: '/auth/logout',
        headers: { cookie: providerCookieHeader(signOut) }
      })

      expect(returned.statusCode).toBe(statusCodes.found)
      expect(returned.headers.location).toBe('/logged-out')
    })

    it('offers them the Defra ID route back in', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      const $ = load(asHtml(result))

      expect($('.govuk-button').attr('href')).toBe('/login')
    })
  })

  describe('when the provider cookie is absent', () => {
    it('sends the user to the operator sign out page', async ({ server }) => {
      const returned = await server.inject({
        method: 'GET',
        url: '/auth/logout'
      })

      expect(returned.statusCode).toBe(statusCodes.found)
      expect(returned.headers.location).toBe('/logged-out')
    })
  })
})
