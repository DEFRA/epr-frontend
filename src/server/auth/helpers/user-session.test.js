import { config } from '#config/config.js'
import { updateUserSession } from '#server/auth/helpers/user-session.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { assertUserSession } from '#server/common/test-helpers/auth-helper.js'
import { bearerAuthHandler } from '#server/common/test-helpers/bearer-auth-helper.js'
import {
  IDENTITIES,
  identityHandler
} from '#server/common/test-helpers/identity-helper.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

/**
 * @import { Mock } from 'vitest'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { AuthProvider } from '#server/auth/types/auth-provider.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 */

const makeRequest = () =>
  mockHapiRequest({
    state: { userSession: { sessionId: 'sess-123' } },
    server: { app: { cache: { set: vi.fn(), drop: vi.fn() } } },
    cookieAuth: { clear: vi.fn() },
    yar: { reset: vi.fn() },
    logger: createMockLogger()
  })

const existingSession = /** @type {UserSession} */ ({
  provider: OIDC_DEFRA_ID,
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

const refreshedTokens = {
  id_token: 'new-id-token',
  refresh_token: 'new-refresh-token',
  expires_in: 3600
}

/**
 * @param {HapiRequest} request
 * @returns {UserSession}
 */
const savedSessionFrom = (request) =>
  assertUserSession(
    /** @type {Mock} */ (request.server.app.cache.set).mock.calls[0]?.[1]
  )

const refreshedProfile = { id: 'user-123', email: 'test@example.com' }
const refreshedExpiry = new Date(Date.now() + 3600 * 1000).toISOString()

/**
 * An auth provider that presents the given token to the backend and reads one
 * fixed identity from it.
 * @param {string} [backendToken]
 * @returns {AuthProvider}
 */
const authProviderPresenting = (backendToken = 'new-id-token') =>
  /** @type {AuthProvider} */ ({
    tokenRequestParams: {},
    selectBackendToken: () => backendToken,
    verifyBackendToken: vi.fn().mockResolvedValue({
      profile: refreshedProfile,
      expiresAt: refreshedExpiry
    })
  })

describe(updateUserSession, () => {
  beforeEach(({ msw }) => {
    msw.use(identityHandler())
  })

  it('should reset idTokenRefreshInProgress to false after updating session', async () => {
    const request = makeRequest()

    await updateUserSession(
      authProviderPresenting(),
      request,
      existingSession,
      refreshedTokens
    )

    // This ensures that id token refresh can run multiple times within the same session if needed
    expect(savedSessionFrom(request).idTokenRefreshInProgress).toBe(false)
  })

  describe('the token presented to the backend', () => {
    it('should be the one the session provider picks from the refreshed tokens', async () => {
      const request = makeRequest()

      await updateUserSession(
        authProviderPresenting('new-access-token'),
        request,
        existingSession,
        { ...refreshedTokens, access_token: 'new-access-token' }
      )

      expect(savedSessionFrom(request).backendToken).toBe('new-access-token')
    })

    it('should still keep the refreshed id token, so logout keeps working', async () => {
      const request = makeRequest()

      await updateUserSession(
        authProviderPresenting('new-access-token'),
        request,
        existingSession,
        { ...refreshedTokens, access_token: 'new-access-token' }
      )

      expect(savedSessionFrom(request).idToken).toBe('new-id-token')
    })

    it('should fail the refresh when the provider cannot pick one', async () => {
      const request = makeRequest()
      const authProvider = {
        ...authProviderPresenting(),
        selectBackendToken: () => {
          throw new Error('Entra ID returned no access token')
        }
      }

      await expect(
        updateUserSession(
          authProvider,
          request,
          existingSession,
          refreshedTokens
        )
      ).rejects.toThrow('Entra ID returned no access token')
    })
  })

  describe('the profile on the refreshed session', () => {
    it('should be read from the token the session presents to the backend', async () => {
      const request = makeRequest()
      const authProvider = authProviderPresenting('new-access-token')

      await updateUserSession(authProvider, request, existingSession, {
        ...refreshedTokens,
        access_token: 'new-access-token'
      })

      expect(authProvider.verifyBackendToken).toHaveBeenCalledExactlyOnceWith(
        'new-access-token'
      )
      expect(savedSessionFrom(request).profile).toStrictEqual(refreshedProfile)
    })

    it('should carry the expiry of that same token', async () => {
      const request = makeRequest()

      await updateUserSession(
        authProviderPresenting(),
        request,
        existingSession,
        refreshedTokens
      )

      expect(savedSessionFrom(request).expiresAt).toBe(refreshedExpiry)
    })
  })

  describe('the identity on the refreshed session', () => {
    it('should be the one the backend answers, not the one the session held', async ({
      msw
    }) => {
      msw.use(identityHandler(IDENTITIES.regulator))
      const request = makeRequest()

      await updateUserSession(
        authProviderPresenting(),
        request,
        existingSession,
        refreshedTokens
      )

      expect(savedSessionFrom(request)).toMatchObject({
        role: IDENTITIES.regulator.role,
        scope: IDENTITIES.regulator.scopes
      })
    })

    it('should drop a scope the backend has stopped granting', async ({
      msw
    }) => {
      msw.use(identityHandler(IDENTITIES.operatorWithoutWrite))
      const request = makeRequest()

      await updateUserSession(
        authProviderPresenting(),
        request,
        existingSession,
        refreshedTokens
      )

      expect(savedSessionFrom(request).scope).toStrictEqual(
        IDENTITIES.operatorWithoutWrite.scopes
      )
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
        authProviderPresenting('new-access-token'),
        request,
        existingSession,
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
          authProviderPresenting(),
          request,
          existingSession,
          refreshedTokens
        )
      ).rejects.toMatchObject({ isBoom: true })
    })
  })

  describe('an identity the backend has stopped granting a role', () => {
    beforeEach(({ msw }) => {
      msw.use(identityHandler(IDENTITIES.unrecognised))
    })

    /**
     * @param {HapiRequest} request
     * @returns {Promise<UserSession | null>}
     */
    const refreshWithdrawnRole = (request) =>
      updateUserSession(
        authProviderPresenting(),
        request,
        existingSession,
        refreshedTokens
      )

    it('should leave the session unwritten, so no scopeless session survives', async () => {
      const request = makeRequest()

      const session = await refreshWithdrawnRole(request)

      expect(session).toBeNull()
      expect(request.server.app.cache.set).not.toHaveBeenCalled()
    })

    it('should end the session, so the user is sent to sign in again', async () => {
      const request = makeRequest()

      await refreshWithdrawnRole(request)

      expect(request.server.app.cache.drop).toHaveBeenCalledExactlyOnceWith(
        'sess-123'
      )
      expect(request.cookieAuth.clear).toHaveBeenCalledExactlyOnceWith()
    })

    it('should say why the session ended', async () => {
      const request = makeRequest()

      await refreshWithdrawnRole(request)

      expect(request.logger.info).toHaveBeenCalledExactlyOnceWith({
        message: 'Backend grants the user no role, so their session was ended',
        event: { action: 'sessionEnded', kind: 'event' }
      })
    })
  })
})
