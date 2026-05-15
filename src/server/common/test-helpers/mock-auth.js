/**
 * @import { UserSession } from '#server/auth/types/session.js'
 */

/** @type {{ strategy: string, credentials: UserSession }} */
export const mockAuth = {
  strategy: 'session',
  credentials: {
    provider: 'defra-id',
    query: {},
    refreshToken: 'mock-refresh-token',
    profile: { id: 'user-123', email: 'test@example.com' },
    expiresAt: '2099-01-01T00:00:00.000Z',
    idToken: 'mock-id-token',
    urls: {
      token: 'http://defra-id.auth/token',
      logout: 'http://defra-id.auth/logout'
    }
  }
}
