import { buildUserProfile, getTokenExpiresAt } from './build-session.js'
import { dropUserSession } from './drop-user-session.js'

/**
 * @import { RefreshedTokens } from '../types/tokens.js'
 * @import { HapiRequest, SessionCookieState } from '#server/common/hapi-types.js'
 * @import { UserSession } from '../types/session.js'
 * @import { VerifyToken } from '../types/verify-token.js'
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
 * @param {VerifyToken} verifyToken - Token verification function
 * @param {HapiRequest} request - Hapi request object
 * @param {UserSession} existingSession - Current user session
 * @param {RefreshedTokens} refreshedTokens - Refreshed tokens from OIDC provider
 * @returns {Promise<UserSession>}
 */
async function updateUserSession(
  verifyToken,
  request,
  existingSession,
  refreshedTokens
) {
  const payload = await verifyToken(refreshedTokens.id_token)

  const profile = buildUserProfile(payload)
  const expiresAt = getTokenExpiresAt(payload)

  /** @type {UserSession} */
  const session = {
    ...existingSession,
    profile,
    expiresAt,
    idToken: refreshedTokens.id_token,
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
