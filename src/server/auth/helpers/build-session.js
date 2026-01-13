import { getDisplayName } from './display.js'

/**
 * @import { DefraIdJwtPayload } from '../types/auth.js'
 * @import { UserProfile, UserSession } from '../types/session.js'
 */

/**
 * Get token expiry as ISO string from JWT payload exp claim
 * @param {{ exp: number }} payload - JWT payload with exp claim
 * @returns {string} ISO date string
 */
const getTokenExpiresAt = ({ exp }) => new Date(exp * 1000).toISOString()

/**
 * Build user profile from JWT payload (pure identity data)
 * @param {DefraIdJwtPayload} payload - JWT token payload with Defra ID claims
 * @returns {UserProfile} User profile object
 */
function buildUserProfile(payload) {
  const displayName = getDisplayName(payload)

  // TODO how much of this is used now we don't display it?
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
    roles: payload.roles
  }
}

export { buildUserProfile, getTokenExpiresAt }
