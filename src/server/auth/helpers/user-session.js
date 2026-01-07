import { addSeconds } from 'date-fns'
import { getDisplayName } from './display.js'
import { dropUserSession } from './drop-user-session.js'
import { getUserSession } from './get-user-session.js'

/**
 * @import { Request } from '@hapi/hapi'
 * @import { DefraIdJwtPayload } from '../types/auth.js'
 * @import { RefreshedTokens } from '../types/tokens.js'
 * @import { UserSession } from '../types/session.js'
 * @import { VerifyToken } from '../types/verify-token.js'
 */

/**
 * Build a user session object from JWT payload and tokens
 * @param {object} options - Session building options
 * @param {DefraIdJwtPayload} options.payload - JWT token payload with Defra ID claims (from verified id_token)
 * @param {{ id_token: string, access_token: string, refresh_token: string, expires_in: number }} options.tokens - Token data with id_token, access_token, refresh_token, and expires_in
 * @returns {Partial<UserSession>} Partial user session object (missing tokenUrl and logoutUrl which are preserved from existing session)
 */
function buildSessionFromPayload({ payload, tokens }) {
  const expiresInSeconds = tokens.expires_in
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds)
  const displayName = getDisplayName(payload)

  return {
    id: payload.sub,
    correlationId: payload.correlationId,
    sessionId: payload.sessionId,
    contactId: payload.contactId,
    serviceId: payload.serviceId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    displayName,
    email: payload.email,
    uniqueReference: payload.uniqueReference,
    loa: payload.loa,
    aal: payload.aal,
    enrolmentCount: payload.enrolmentCount,
    enrolmentRequestCount: payload.enrolmentRequestCount,
    currentRelationshipId: payload.currentRelationshipId,
    relationships: payload.relationships,
    roles: payload.roles,
    isAuthenticated: true,
    idToken: tokens.id_token,
    token: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: expiresInMilliSeconds,
    expiresAt
  }
}

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

    const { value: authedUser } = await getUserSession(request)

    if (!authedUser) {
      throw new Error(
        'Cannot update session: session was deleted during token refresh'
      )
    }

    const updatedSession = buildSessionFromPayload({
      payload,
      tokens: refreshedSession
    })

    const session = {
      ...authedUser,
      ...updatedSession
    }

    await request.server.app.cache.set(
      request.state.userSession.sessionId,
      session
    )

    return session
  }

export { buildSessionFromPayload, createUpdateUserSession, removeUserSession }
