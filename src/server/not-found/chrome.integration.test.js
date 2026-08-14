import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { REGULATOR_ROLE } from '#server/auth/roles.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { asUserSession } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import Iron from '@hapi/iron'
import { queryByRole, queryByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { ServerFixtures } from '#vite/fixtures/server.js'
 */

/**
 * A path that matches no registered route. The real route spells it
 * `summary-logs`, so this singular reading has never matched anything, and
 * hapi answers it without ever authenticating the request. Driving the test
 * through a real session cookie rather than `inject`'s `auth` option is what
 * makes that visible: `auth` attaches credentials whatever the router did.
 */
const unmatchedPath =
  '/organisations/6507f1f77bcf86cd79943901/registrations/reg-1/summary-log/upload'

const regulatorSession = asUserSession({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'jane.doe@example.com' },
  role: REGULATOR_ROLE,
  scope: [SCOPES.organisationSearch, SCOPES.regulator],
  backendToken: 'mock-backend-token',
  expiresAt: '2099-01-01T00:00:00.000Z',
  idToken: 'mock-id-token',
  urls: {
    token: 'http://entra-id.auth/token',
    logout: 'http://entra-id.auth/logout'
  }
})

/**
 * Signs a regulator in the way the session strategy reads them back: the
 * session in the cache, and a sealed cookie pointing at it.
 * @param {ServerFixtures['server']} server
 * @returns {Promise<string>}
 */
const signedInRegulatorCookie = async (server) => {
  const sessionId = 'regulator-session-1'

  await server.app.cache.set(sessionId, regulatorSession)

  const sealed = await Iron.seal(
    { sessionId },
    config.get('session.cookie.password'),
    Iron.defaults
  )

  return `userSession=${sealed}`
}

describe('the chrome a regulator reads on a page that is not there', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  /**
   * @param {ServerFixtures['server']} server
   */
  const visitUnmatchedAsRegulator = async (server) => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: unmatchedPath,
      headers: { cookie: await signedInRegulatorCookie(server) }
    })

    return { statusCode, body: new JSDOM(asHtml(result)).window.document.body }
  }

  it('answers with a 404', async ({ server }) => {
    const { statusCode } = await visitUnmatchedAsRegulator(server)

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('names the regulator service rather than the operator one', async ({
    server
  }) => {
    const { body } = await visitUnmatchedAsRegulator(server)

    expect(
      queryByText(body, 'Check reprocessed or exported packaging waste')
    ).not.toBeNull()
    expect(
      queryByText(body, 'Record reprocessed or exported packaging waste')
    ).toBeNull()
  })

  it('keeps the regulator navigation', async ({ server }) => {
    const { body } = await visitUnmatchedAsRegulator(server)

    expect(queryByRole(body, 'link', { name: 'Sign out' })).not.toBeNull()
    expect(queryByRole(body, 'link', { name: 'Home' })).not.toBeNull()
  })

  it('answers a stranger with a 404 rather than sending them to sign in', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: unmatchedPath
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
