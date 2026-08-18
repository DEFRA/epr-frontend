import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  assertUserSession,
  asUserSession
} from '#server/common/test-helpers/auth-helper.js'
import {
  IDENTITIES,
  identityHandler
} from '#server/common/test-helpers/identity-helper.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import Iron from '@hapi/iron'
import * as jose from 'jose'
import { http, HttpResponse } from 'msw'
import { createPrivateKey, generateKeyPairSync } from 'node:crypto'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const entraClaims = {
  oid: 'entra-user-id',
  preferred_username: 'jane.doe@example.com',
  aud: 'test-entra-client-id',
  iss: 'https://login.microsoftonline.com/test-tenant-id/v2.0'
}

const { privateKey: privateKeyObject, publicKey: publicKeyObject } =
  generateKeyPairSync('rsa', { modulusLength: 2048 })

const publicKey = publicKeyObject.export({ format: 'jwk' })
const privateKeyPem = createPrivateKey(
  privateKeyObject.export({ type: 'pkcs8', format: 'pem' })
)

/**
 * @param {Record<string, unknown>} payload
 * @returns {Promise<string>}
 */
const signAccessToken = (payload) =>
  new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
    .setExpirationTime('2h')
    .sign(privateKeyPem)

const nearlyExpired = () => new Date(Date.now() + 5 * 1000).toISOString()

const entraSession = () =>
  asUserSession({
    provider: OIDC_ENTRA_ID,
    query: {},
    profile: { id: 'entra-user-id', email: 'jane.doe@example.com' },
    expiresAt: nearlyExpired(),
    idToken: 'old-id-token',
    backendToken: 'old-access-token',
    refreshToken: 'old-refresh-token',
    role: IDENTITIES.regulator.role,
    scope: IDENTITIES.regulator.scopes,
    urls: {
      token: 'http://entra-id.auth/token',
      logout: 'http://entra-id.auth/logout'
    }
  })

/**
 * @param {HapiServer} server
 * @returns {Promise<string>}
 */
const seedSession = async (server) => {
  const sessionId = 'entra-session-id'
  await server.app.cache.set(sessionId, entraSession())

  const sealedCookie = await Iron.seal(
    { sessionId },
    config.get('session.cookie.password'),
    Iron.defaults
  )

  return `userSession=${sealedCookie}`
}

describe('an Entra ID session whose token is about to expire', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  /** @type {{ body: URLSearchParams } | undefined} */
  let tokenRequest

  beforeEach(async ({ server, msw }) => {
    tokenRequest = undefined

    msw.use(
      identityHandler(IDENTITIES.regulator),
      http.get('http://entra-id.auth/.well-known/jwks.json', () =>
        HttpResponse.json({ keys: [{ ...publicKey, kid: 'test-key-id' }] })
      ),
      http.post('http://entra-id.auth/token', async ({ request }) => {
        tokenRequest = {
          body: new URLSearchParams(await request.clone().text())
        }

        return HttpResponse.json({
          access_token: await signAccessToken(entraClaims),
          id_token: 'new-id-token',
          refresh_token: 'new-refresh-token'
        })
      })
    )

    server.route({
      method: 'GET',
      path: '/test-auth',
      options: { auth: 'session' },
      handler: (request) => ({ id: request.auth.credentials.profile.id })
    })
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  /**
   * @param {HapiServer} server
   */
  const requestWithSession = async (server) =>
    server.inject({
      method: 'GET',
      url: '/test-auth',
      headers: { cookie: await seedSession(server) }
    })

  it('keeps the regulator signed in', async ({ server }) => {
    const response = await requestWithSession(server)

    expect(response.statusCode).toBe(statusCodes.ok)
  })

  it('asks Entra ID for the refresh with its own client credentials', async ({
    server
  }) => {
    await requestWithSession(server)

    expect(
      Object.fromEntries(/** @type {URLSearchParams} */ (tokenRequest?.body))
    ).toStrictEqual({
      client_id: 'test-entra-client-id',
      client_secret: 'test-entra-secret',
      grant_type: 'refresh_token',
      refresh_token: 'old-refresh-token',
      scope:
        'openid profile email offline_access api://test-entra-client-id/.default'
    })
  })

  it('presents the refreshed access token to the backend', async ({
    server
  }) => {
    await requestWithSession(server)

    const session = assertUserSession(
      await server.app.cache.get('entra-session-id')
    )

    expect(jose.decodeJwt(session.backendToken)).toMatchObject({
      oid: 'entra-user-id'
    })
  })

  it('reads the identity of the refreshed session from the Entra claims', async ({
    server
  }) => {
    await requestWithSession(server)

    const session = assertUserSession(
      await server.app.cache.get('entra-session-id')
    )

    expect(session.profile).toStrictEqual({
      id: 'entra-user-id',
      email: 'jane.doe@example.com'
    })
  })

  it('keeps the role and the scopes the backend grants', async ({ server }) => {
    await requestWithSession(server)

    const session = assertUserSession(
      await server.app.cache.get('entra-session-id')
    )

    expect(session).toMatchObject({
      role: IDENTITIES.regulator.role,
      scope: IDENTITIES.regulator.scopes
    })
  })

  it('moves the session expiry past the moment it was about to expire', async ({
    server
  }) => {
    await requestWithSession(server)

    const session = assertUserSession(
      await server.app.cache.get('entra-session-id')
    )

    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(
      Date.now() + 60 * 1000
    )
  })

  it('keeps the refreshed id token for the logout hint', async ({ server }) => {
    await requestWithSession(server)

    const session = assertUserSession(
      await server.app.cache.get('entra-session-id')
    )

    expect(session.idToken).toBe('new-id-token')
  })

  describe('whose role the backend has withdrawn', () => {
    beforeEach(({ msw }) => {
      msw.use(identityHandler(IDENTITIES.unrecognised))
    })

    it('sends the regulator back to sign in', async ({ server }) => {
      const response = await requestWithSession(server)

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe('/logged-out')
    })

    it('leaves no session for the next request to carry', async ({
      server
    }) => {
      await requestWithSession(server)

      await expect(server.app.cache.get('entra-session-id')).resolves.toBeNull()
    })
  })
})
