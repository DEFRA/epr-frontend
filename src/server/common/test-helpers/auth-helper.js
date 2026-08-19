import { SESSION_STRATEGY } from '#server/auth/helpers/session-cookie.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'

/**
 * @import { Identity } from '#server/auth/helpers/fetch-identity.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { UserOrganisations } from '#server/auth/types/organisations.js'
 */

/**
 * The two credential fields a session takes from a backend identity, for a test
 * that builds a session with {@link buildMockAuth}. `updateUserSession` maps
 * `/v1/me` the same way, so a test session holds what the backend granted and
 * one place decides what an identity is.
 * @param {Identity} identity
 * @returns {{ role: string | null, scope: string[] }}
 */
export const sessionIdentity = ({ role, scopes }) => ({
  role,
  scope: [...scopes]
})

/**
 * Builds a `session`-strategy auth object for `server.inject`, with credentials
 * that satisfy the app's `AuthCredentials` augmentation (see
 * `src/server/types/hapi.d.ts` -> `UserSession`). Pass overrides to vary
 * individual credential fields (e.g. `backendToken`).
 *
 * The default is an operator, carrying the role and scopes the backend grants
 * a Defra ID identity. Pass `scope` to build a session that holds something
 * else.
 * @param {Partial<UserSession>} [overrides]
 * @returns {{ strategy: string, credentials: UserSession }}
 */
export const buildMockAuth = (overrides = {}) => ({
  strategy: SESSION_STRATEGY,
  credentials: {
    provider: OIDC_DEFRA_ID,
    query: {},
    refreshToken: 'mock-refresh-token',
    profile: { id: 'user-123', email: 'test@example.com' },
    expiresAt: '2099-01-01T00:00:00.000Z',
    idToken: 'mock-id-token',
    backendToken: 'mock-backend-token',
    ...sessionIdentity(IDENTITIES.operator),
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
