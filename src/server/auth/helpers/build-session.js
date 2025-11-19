import { addSeconds } from 'date-fns'
import { getDisplayName } from './display.js'

/**
 * Build user profile from JWT payload
 * @param {object} options - Profile building options
 * @param {object} options.payload - JWT token payload
 * @param {string} options.idToken - ID token
 * @param {string} options.tokenUrl - OIDC token endpoint URL
 * @param {string} options.logoutUrl - OIDC logout endpoint URL
 * @returns {UserProfile} User profile object
 */
function buildUserProfile({ payload, idToken, tokenUrl, logoutUrl }) {
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
    idToken,
    tokenUrl,
    logoutUrl
  }
}

/**
 * Build complete user session from profile and credentials
 * @param {object} options - Session building options
 * @param {UserProfile} options.profile - User profile from Bell
 * @param {{ token: string, refreshToken: string, expiresIn: number }} options.credentials - Bell credentials with token, refreshToken, and expiresIn
 * @param {boolean} options.isAuthenticated - Authentication status
 * @returns {UserSession} Complete user session
 */
function buildSessionFromProfile({ credentials, isAuthenticated, profile }) {
  const expiresInSeconds = credentials.expiresIn
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds)

  return {
    ...profile,
    isAuthenticated,
    token: credentials.token,
    refreshToken: credentials.refreshToken,
    expiresIn: expiresInMilliSeconds,
    expiresAt
  }
}

export { buildSessionFromProfile, buildUserProfile }

/**
 * @import { UserProfile, UserSession } from '../types/session.js'
 */
