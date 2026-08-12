import { updateUserSession } from '#server/auth/helpers/user-session.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { describe, expect, it, vi } from 'vitest'

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
})
