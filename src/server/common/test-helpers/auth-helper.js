/**
 * @import { UserSession } from '#server/auth/types/session.js'
 */

/**
 * Builds a `session`-strategy auth object for `server.inject`, with credentials
 * that satisfy the app's `AuthCredentials` augmentation (see
 * `src/server/types/hapi.d.ts` -> `UserSession`). Pass overrides to vary
 * individual credential fields (e.g. `idToken`).
 * @param {Partial<UserSession>} [overrides]
 * @returns {{ strategy: string, credentials: UserSession }}
 */
export const buildMockAuth = (overrides = {}) => ({
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
    },
    ...overrides
  }
})
