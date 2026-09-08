import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { ServerFixtures } from '#vite/fixtures/server.js'
 */

const regulatorAuth = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'jane.doe@example.com' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {ServerFixtures['server']} server
 * @param {string} url
 * @param {ReturnType<typeof buildMockAuth>} [auth]
 */
const open = async (server, url, auth) => {
  const { statusCode, result } = await server.inject({
    method: 'GET',
    url,
    auth
  })

  const html = asHtml(result)

  return { statusCode, html, body: new JSDOM(html).window.document.body }
}

describe('/regulators/start - GET integration', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  // A bookmark is only worth keeping if it renders whatever the browser holds,
  // so both auth states are the same requirement rather than two.
  const sessions = [
    { held: 'no session is held', auth: undefined },
    { held: 'a session is held', auth: regulatorAuth }
  ]

  it.for(sessions)(
    'heads the page with what the regulator gets access to when $held',
    async ({ auth }, { server }) => {
      const { statusCode, body } = await open(server, '/regulators/start', auth)

      expect(statusCode).toBe(statusCodes.ok)
      expect(getByRole(body, 'heading', { level: 1 }).textContent?.trim()).toBe(
        'Access reprocessed or exported packaging waste data'
      )
    }
  )

  it.for(sessions)(
    'says who the service is for and what it holds when $held',
    async ({ auth }, { server }) => {
      const { body } = await open(server, '/regulators/start', auth)

      expect(
        getByText(
          body,
          'This service gives regulators from across the four nations access to UK packaging waste regulations operator data.'
        )
      ).toBeDefined()
      expect(
        getByText(
          body,
          'The service provides access to summary log, report, PRN and PERN data.'
        )
      ).toBeDefined()
    }
  )

  it.for(sessions)(
    'offers the way in to Entra ID sign in when $held',
    async ({ auth }, { server }) => {
      const { body } = await open(server, '/regulators/start', auth)

      expect(
        getByRole(body, 'button', { name: 'Start now' }).getAttribute('href')
      ).toBe('/regulators/login')
    }
  )

  // The service name reaches the title as well as the header, so this reads the
  // whole document rather than the body alone.
  it('does not name the operator service to a regulator', async ({
    server
  }) => {
    const { html } = await open(server, '/regulators/start')

    expect(html).not.toContain('Record reprocessed or exported packaging waste')
  })

  // The header's service link is the one place on this page that can take a
  // reader holding no session to an address that refuses them, which lands them
  // on the operator's signed out page: the very thing a regulator keeps a link
  // here to avoid.
  it.for(sessions)(
    'points the header service link at an address that renders when $held',
    async ({ auth }, { server }) => {
      const { body } = await open(server, '/regulators/start', auth)

      expect(
        getByRole(body, 'link', {
          name: 'Check reprocessed or exported packaging waste'
        }).getAttribute('href')
      ).toBe('/regulators/start')
    }
  )

  it('renders in Welsh with the way in kept in Welsh', async ({ server }) => {
    const { statusCode, body } = await open(server, '/cy/regulators/start')

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(body, 'button', { name: 'Start now' }).getAttribute('href')
    ).toBe('/cy/regulators/login')
  })
})

describe('when regulator access is switched off', () => {
  it('does not register the regulator start page at all', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/regulators/start'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
