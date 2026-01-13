import { buildUserProfile, getTokenExpiresAt } from './build-session.js'
import { dropUserSession } from './drop-user-session.js'
import { getUserSession } from './get-user-session.js'

/**
 * @import { Request } from '@hapi/hapi'
 * @import { RefreshedTokens } from '../types/tokens.js'
 * @import { UserSession } from '../types/session.js'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * Remove user session from cache and clear cookie
 * @param {Request} request - Hapi request object
 * @returns {Promise<void>}
 */
async function removeUserSession(request) {
  await dropUserSession(request)
  request.cookieAuth?.clear()
}

/**
 * Update user session with refreshed tokens
 * @param {VerifyToken} verifyToken - Token verification function
 * @param {Request} request - Hapi request object
 * @param {RefreshedTokens} refreshedTokens - Refreshed tokens from OIDC provider
 * @returns {Promise<UserSession>}
 */
async function updateUserSession(verifyToken, request, refreshedTokens) {
  const payload = await verifyToken(refreshedTokens.id_token)

  const { value: existingSession } = await getUserSession(request)

  if (!existingSession) {
    throw new Error(
      'Cannot update session: session was deleted during token refresh'
    )
  }

  const profile = buildUserProfile(payload)
  const expiresAt = getTokenExpiresAt(payload)

  const session = {
    ...existingSession,
    profile,
    expiresAt,
    idToken: refreshedTokens.id_token,
    refreshToken: refreshedTokens.refresh_token
  }

  await request.server.app.cache.set(
    request.state.userSession.sessionId,
    session
  )

  return session
}

export { updateUserSession, removeUserSession }
