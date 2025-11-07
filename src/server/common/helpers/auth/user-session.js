import jwt from '@hapi/jwt'
import { addSeconds } from 'date-fns'
import { getDisplayName } from './display.js'
import { dropUserSession } from './drop-user-session.js'
import { getUserSession } from './get-user-session.js'

/**
 * Remove user session from cache and clear cookie
 * @param {Request} request - Hapi request object
 * @returns {void}
 */
async function removeUserSession(request) {
  await dropUserSession(request)
  request.cookieAuth.clear()
  request.server.app.defraId = null
}

/**
 * Update user session with refreshed tokens
 * @param {Request} request - Hapi request object
 * @param {RefreshedTokens} refreshedSession - Refreshed session data
 * @returns {Promise<UserSession>}
 */
async function updateUserSession(request, refreshedSession) {
  const payload = jwt.token.decode(refreshedSession.access_token).decoded
    .payload

  // Update userSession with new access token and new expiry details
  const expiresInSeconds = refreshedSession.expires_in
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds)
  const authedUser = await getUserSession(request)
  const displayName = getDisplayName(payload)

  await request.server.app.cache.set(request.state.userSession.sessionId, {
    ...authedUser,
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
    idToken: refreshedSession.id_token,
    token: refreshedSession.access_token,
    refreshToken: refreshedSession.refresh_token,
    expiresIn: expiresInMilliSeconds,
    expiresAt
  })

  return getUserSession(request)
}

export { removeUserSession, updateUserSession }

/**
 * @import { Request } from '@hapi/hapi'
 * @import { UserSession } from '#server/common/helpers/auth/get-user-session.js'
 */

/**
 * @typedef {object} RefreshedTokens
 * @property {string} access_token
 * @property {string} refresh_token
 * @property {string} id_token
 * @property {number} expires_in
 */
