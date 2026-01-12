import {
  buildSessionFromProfile,
  buildUserProfile,
  getTokenExpiresAt
} from './build-session.js'
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
 * @returns {void}
 */
async function removeUserSession(request) {
  await dropUserSession(request)
  request.cookieAuth?.clear()
}

/**
 * Create updateUserSession function with verifyToken closure
 * @param {VerifyToken} verifyToken - Token verification function
 * @returns {(request: Request, refreshedSession: RefreshedTokens) => Promise<UserSession>} updateUserSession function
 */
const createUpdateUserSession = (verifyToken) =>
  /**
   * Update user session with refreshed tokens
   * @param {Request} request - Hapi request object
   * @param {RefreshedTokens} refreshedSession - Refreshed session data
   * @returns {Promise<UserSession>}
   */
  async function updateUserSession(request, refreshedSession) {
    const payload = await verifyToken(refreshedSession.id_token)

    const { value: existingSession } = await getUserSession(request)

    if (!existingSession) {
      throw new Error(
        'Cannot update session: session was deleted during token refresh'
      )
    }

    const profile = buildUserProfile(payload)
    const expiresAt = getTokenExpiresAt(payload)

    const session = {
      ...buildSessionFromProfile({
        profile,
        expiresAt,
        idToken: refreshedSession.id_token,
        refreshToken: refreshedSession.refresh_token,
        urls: existingSession.urls
      }),
      linkedOrganisationId: existingSession.linkedOrganisationId
    }

    await request.server.app.cache.set(
      request.state.userSession.sessionId,
      session
    )

    return session
  }

export { createUpdateUserSession, removeUserSession }
