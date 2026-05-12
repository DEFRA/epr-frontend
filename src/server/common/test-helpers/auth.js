/**
 * @import { ServerInjectOptions } from '@hapi/hapi'
 * @import { UserSession } from '#server/auth/types/session.js'
 */

/**
 * Default credentials for the `mockAuth` fixture. Satisfies `UserSession`
 * (which `AuthCredentials` is augmented to in `src/server/types/hapi.d.ts`),
 * so the auth fixture is properly typed without an `any` cast. Exported
 * separately so tests can assert on individual fields (e.g.
 * `mockCredentials.idToken`).
 *
 * @type {UserSession}
 */
export const mockCredentials = {
  provider: 'defra-id',
  query: {},
  idToken: 'mock-id-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: '2099-01-01T00:00:00.000Z',
  urls: {
    token: 'https://example.test/token',
    logout: 'https://example.test/logout'
  },
  profile: {
    id: 'user-123',
    email: 'test@example.com'
  }
}

/**
 * Build a `server.inject({ ..., auth })` fixture.
 *
 * @param {UserSession} [credentials]
 * @returns {ServerInjectOptions['auth']}
 */
export const buildAuth = (credentials = mockCredentials) => ({
  strategy: 'session',
  credentials
})

/**
 * Default mock auth for `server.inject({ ..., auth })` calls.
 */
export const mockAuth = buildAuth()
