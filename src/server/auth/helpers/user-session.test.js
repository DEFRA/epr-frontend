import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { updateUserSession } from '#server/auth/helpers/user-session.js'
import { describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

const makeRequest = () => ({
  state: { userSession: { sessionId: 'sess-123' } },
  server: { app: { cache: { set: vi.fn() } } }
})

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

    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: {
        profile: { id: 'user-123', email: 'test@example.com' },
        expiresAt: new Date().toISOString(),
        idToken: 'old-id-token',
        refreshToken: 'old-refresh-token',
        idTokenRefreshInProgress: true,
        urls: { token: 'http://auth/token', logout: 'http://auth/logout' }
      }
    })

    const request = makeRequest()

    await updateUserSession(mockVerifyToken, request, refreshedTokens)

    const savedSession = request.server.app.cache.set.mock.calls[0][1]

    // This ensures that id token refresh can run multiple times within the same session if needed
    expect(savedSession.idTokenRefreshInProgress).toBe(false)
  })

  it('should throw error when session is deleted during token refresh', async () => {
    const mockVerifyToken = vi.fn().mockResolvedValue({
      sub: 'user-123',
      email: 'test@example.com'
    })

    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: null
    })

    const request = makeRequest()

    await expect(
      updateUserSession(mockVerifyToken, request, refreshedTokens)
    ).rejects.toThrowError(
      'Cannot update session: session was deleted during token refresh'
    )

    expect(request.server.app.cache.set).not.toHaveBeenCalled()
  })
})
