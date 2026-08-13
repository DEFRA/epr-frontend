import { config } from '#config/config.js'
import { updateUserSession } from '#server/auth/helpers/user-session.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { bearerAuthHandler } from '#server/common/test-helpers/bearer-auth-helper.js'
import {
  IDENTITIES,
  identityHandler
} from '#server/common/test-helpers/identity-helper.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

/**
 * @import { Mock } from 'vitest'
 * @import { UserSession } from '#server/auth/types/session.js'
 */

const makeRequest = () =>
  mockHapiRequest({
    state: { userSession: { sessionId: 'sess-123' } },
    server: { app: { cache: { set: vi.fn() } } }
  })

const sessionFor = (provider) =>
  /** @type {UserSession} */ ({
    provider,
    profile: { id: 'user-123', email: 'test@example.com' },
    expiresAt: new Date().toISOString(),
    idToken: 'old-id-token',
    backendToken: 'old-backend-token',
    refreshToken: 'old-refresh-token',
    idTokenRefreshInProgress: true,
    role: IDENTITIES.operator.role,
    scope: IDENTITIES.operator.scopes,
    urls: {
      token: 'http://oidc-provider/token',
      logout: 'http://oidc-provider/logout'
    }
  })

const existingSession = sessionFor(OIDC_DEFRA_ID)

const refreshedTokens = {
  id_token: 'new-id-token',
  refresh_token: 'new-refresh-token',
  expires_in: 3600
}

const savedSessionFrom = (request) =>
  /** @type {Mock} */ (request.server.app.cache.set).mock.calls[0][1]

const verifiesTheRefreshedToken = () =>
  vi.fn().mockResolvedValue({
    sub: 'user-123',
    email: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600
  })

describe(updateUserSession, () => {
  beforeEach(({ msw }) => {
    msw.use(identityHandler())
  })

  it('should reset idTokenRefreshInProgress to false after updating session', async () => {
    const request = makeRequest()

    await updateUserSession(
      verifiesTheRefreshedToken(),
      request,
      existingSession,
      refreshedTokens
    )

    // This ensures that id token refresh can run multiple times within the same session if needed
    expect(savedSessionFrom(request).idTokenRefreshInProgress).toBe(false)
  })

  describe('the token presented to the backend', () => {
    it('should be the refreshed id token for a Defra ID session', async () => {
      const request = makeRequest()

      await updateUserSession(
        verifiesTheRefreshedToken(),
        request,
        sessionFor(OIDC_DEFRA_ID),
        refreshedTokens
      )

      expect(savedSessionFrom(request).backendToken).toBe('new-id-token')
    })

    it('should be the refreshed access token for an Entra ID session', async () => {
      const request = makeRequest()

      await updateUserSession(
        verifiesTheRefreshedToken(),
        request,
        sessionFor(OIDC_ENTRA_ID),
        { ...refreshedTokens, access_token: 'new-access-token' }
      )

      expect(savedSessionFrom(request).backendToken).toBe('new-access-token')
    })

    it('should still be the refreshed id token for an Entra ID session, so logout keeps working', async () => {
      const request = makeRequest()

      await updateUserSession(
        verifiesTheRefreshedToken(),
        request,
        sessionFor(OIDC_ENTRA_ID),
        { ...refreshedTokens, access_token: 'new-access-token' }
      )

      expect(savedSessionFrom(request).idToken).toBe('new-id-token')
    })

    it('should fail the refresh when Entra ID returns no access token', async () => {
      const request = makeRequest()

      await expect(
        updateUserSession(
          verifiesTheRefreshedToken(),
          request,
          sessionFor(OIDC_ENTRA_ID),
          refreshedTokens
        )
      ).rejects.toThrow('Entra ID refresh returned no access token')
    })
  })

  describe('the identity on the refreshed session', () => {
    it('should be the one the backend answers, not the one the session held', async ({
      msw
    }) => {
      msw.use(identityHandler(IDENTITIES.regulator))
      const request = makeRequest()

      await updateUserSession(
        verifiesTheRefreshedToken(),
        request,
        sessionFor(OIDC_ENTRA_ID),
        { ...refreshedTokens, access_token: 'new-access-token' }
      )

      expect(savedSessionFrom(request)).toMatchObject({
        role: IDENTITIES.regulator.role,
        scope: IDENTITIES.regulator.scopes
      })
    })

    it('should drop a scope the backend has stopped granting', async ({
      msw
    }) => {
      msw.use(identityHandler(IDENTITIES.unrecognised))
      const request = makeRequest()

      await updateUserSession(
        verifiesTheRefreshedToken(),
        request,
        existingSession,
        refreshedTokens
      )

      expect(savedSessionFrom(request).scope).toStrictEqual([])
    })

    it('should be asked for with the refreshed token, not the one it replaces', async ({
      msw
    }) => {
      msw.use(
        bearerAuthHandler(
          'get',
          `${config.get('eprBackendUrl')}/v1/me`,
          'new-access-token',
          () => HttpResponse.json(IDENTITIES.regulator)
        )
      )
      const request = makeRequest()

      await updateUserSession(
        verifiesTheRefreshedToken(),
        request,
        sessionFor(OIDC_ENTRA_ID),
        { ...refreshedTokens, access_token: 'new-access-token' }
      )

      expect(savedSessionFrom(request).role).toBe(IDENTITIES.regulator.role)
    })

    it('should fail the refresh when the backend will not say who the user is', async ({
      msw
    }) => {
      msw.use(
        http.get(`${config.get('eprBackendUrl')}/v1/me`, () =>
          HttpResponse.json({ error: 'Unauthorised' }, { status: 401 })
        )
      )
      const request = makeRequest()

      await expect(
        updateUserSession(
          verifiesTheRefreshedToken(),
          request,
          existingSession,
          refreshedTokens
        )
      ).rejects.toMatchObject({ isBoom: true })
    })
  })
})
