/**
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { UserOrganisations } from '#server/auth/types/organisations.js'
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

/**
 * Casts a partial mock object to the `UserSession` shape, for tests that seed a
 * session directly (e.g. `server.app.cache.set`).
 * @param {unknown} data
 * @returns {UserSession}
 */
export const asUserSession = (data) => /** @type {UserSession} */ (data)

/**
 * Like {@link asUserSession} but asserts the value is present, for sites that
 * read a `server.app.cache.get` result and would otherwise dereference `null`.
 * @param {unknown} data
 * @returns {UserSession}
 */
export const assertUserSession = (data) => {
  if (!data) {
    throw new Error('expected a user session')
  }

  return /** @type {UserSession} */ (data)
}

/**
 * Casts a partial mock object to the `UserOrganisations` shape that
 * `fetchUserOrganisations` resolves.
 * @param {unknown} data
 * @returns {UserOrganisations}
 */
export const asUserOrganisations = (data) =>
  /** @type {UserOrganisations} */ (data)
