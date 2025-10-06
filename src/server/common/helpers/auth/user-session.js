import jwt from '@hapi/jwt'
import { addSeconds } from 'date-fns'

/**
 * Remove user session from cache and clear cookie
 * @param {object} request - Hapi request object
 */
function removeUserSession(request) {
  request.dropUserSession()
  request.cookieAuth.clear()
}

/**
 * Update user session with refreshed tokens
 * @param {object} request - Hapi request object
 * @param {object} refreshedSession - Refreshed session data
 * @returns {Promise<object>}
 */
async function updateUserSession(request, refreshedSession) {
  const payload = jwt.token.decode(refreshedSession.access_token).decoded
    .payload

  // Update userSession with new access token and new expiry details
  const expiresInSeconds = refreshedSession.expires_in
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds)
  const authedUser = await request.getUserSession()
  const displayName = [payload.firstName, payload.lastName]
    .filter((part) => part)
    .join(' ')

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

  return await request.getUserSession()
}

export { removeUserSession, updateUserSession }
