import { dropUserSession } from './drop-user-session.js'
import { fetchIdentity } from './fetch-identity.js'

/**
 * @import { RefreshedTokens } from './refreshed-tokens-schema.js'
 * @import { HapiRequest, SessionCookieState } from '#server/common/hapi-types.js'
 * @import { AuthProvider } from '../types/auth-provider.js'
 * @import { UserSession } from '../types/session.js'
 */

/**
 * Remove user session from cache and clear cookies
 * @param {HapiRequest} request - Hapi request object
 * @returns {Promise<void>}
 */
async function removeUserSession(request) {
  await dropUserSession(request)
  request.cookieAuth?.clear()
  request.yar?.reset()
}

/**
 * Update user session to flag that an id token refresh is in progress
 * @param {HapiRequest} request - Hapi request object
 * @param {UserSession} userSession - Current user session
 * @returns {Promise<void>}
 */
async function markSessionAsIdTokenRefreshInProgress(request, userSession) {
  const sessionState = /** @type {SessionCookieState} */ (
    request.state.userSession
  )
  await request.server.app.cache.set(sessionState.sessionId, {
    ...userSession,
    idTokenRefreshInProgress: true
  })
}

/**
 * Update user session with refreshed tokens
 *
 * The identity is asked for again on every refresh, so a permission the
 * backend changes reaches a signed-in user within the refresh cadence rather
 * than at the end of their session.
 *
 * The session's profile and expiry come from the token it presents to the
 * backend, which is the token its provider verifies at sign-in.
 * @param {AuthProvider} authProvider - The auth provider that issued the session
 * @param {HapiRequest} request - Hapi request object
 * @param {UserSession} existingSession - Current user session
 * @param {RefreshedTokens} refreshedTokens - Refreshed tokens from OIDC provider
 * @returns {Promise<UserSession>}
 */
async function updateUserSession(
  authProvider,
  request,
  existingSession,
  refreshedTokens
) {
  const backendToken = authProvider.selectBackendToken(refreshedTokens)
  const { profile, expiresAt } =
    await authProvider.verifyBackendToken(backendToken)
  const { role, scopes } = await fetchIdentity(backendToken)

  /** @type {UserSession} */
  const session = {
    ...existingSession,
    profile,
    expiresAt,
    idToken: refreshedTokens.id_token,
    backendToken,
    role,
    scope: scopes,
    refreshToken: refreshedTokens.refresh_token,
    idTokenRefreshInProgress: false
  }

  const sessionState = /** @type {SessionCookieState} */ (
    request.state.userSession
  )
  await request.server.app.cache.set(sessionState.sessionId, session)

  return session
}

export {
  markSessionAsIdTokenRefreshInProgress,
  removeUserSession,
  updateUserSession
}
