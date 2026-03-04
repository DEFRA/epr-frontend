import { updateUserSession } from '#server/auth/helpers/user-session.js'
import { describe, expect, it, vi } from 'vitest'

const makeRequest = () => ({
  state: { userSession: { sessionId: 'sess-123' } },
  server: { app: { cache: { set: vi.fn() } } }
})

const existingSession = {
  profile: { id: 'user-123', email: 'test@example.com' },
  expiresAt: new Date().toISOString(),
  idToken: 'old-id-token',
  refreshToken: 'old-refresh-token',
  idTokenRefreshInProgress: true,
  urls: { token: 'http://auth/token', logout: 'http://auth/logout' }
}

const refreshedTokens = {
  id_token: 'new-id-token',
  refresh_token: 'new-refresh-token',
  expires_in: 3600
}

describe(updateUserSession, () => {
  it('should reset idTokenRefreshInProgress to false after updating session', async () => {
    const mockVerifyToken = vi.fn().mockResolvedValue({
      sub: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600
    })

    const request = makeRequest()

    await updateUserSession(
      mockVerifyToken,
      request,
      existingSession,
      refreshedTokens
    )

    const savedSession = request.server.app.cache.set.mock.calls[0][1]

    // This ensures that id token refresh can run multiple times within the same session if needed
    expect(savedSession.idTokenRefreshInProgress).toBe(false)
  })
})
