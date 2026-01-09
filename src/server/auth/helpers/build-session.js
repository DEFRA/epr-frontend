import { addSeconds, fromUnixTime } from 'date-fns'
import { getDisplayName } from './display.js'

/**
 * Calculate token expiry date from available sources
 * Falls back to JWT exp claim if expiresIn is not available (common with ID tokens)
 * @param {number | null | undefined} expiresIn - Seconds until expiry (from access token)
 * @param {number | undefined} jwtExp - JWT exp claim (Unix timestamp)
 * @returns {{ expiresAt: Date, expiresInMs: number }}
 */
function calculateExpiry(expiresIn, jwtExp) {
  if (expiresIn != null && expiresIn > 0) {
    return {
      expiresAt: addSeconds(new Date(), expiresIn),
      expiresInMs: expiresIn * 1000
    }
  }

  // Fallback to JWT exp claim
  if (jwtExp) {
    const expiresAt = fromUnixTime(jwtExp)
    const expiresInMs = expiresAt.getTime() - Date.now()
    return { expiresAt, expiresInMs }
  }

  // Default to 1 hour if no expiry info available
  const defaultExpiresIn = 3600
  return {
    expiresAt: addSeconds(new Date(), defaultExpiresIn),
    expiresInMs: defaultExpiresIn * 1000
  }
}

/**
 * Build user profile from JWT payload
 * @param {object} options - Profile building options
 * @param {DefraIdJwtPayload} options.payload - JWT token payload with Defra ID claims
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
    logoutUrl,
    jwtExp: payload.exp // JWT expiry timestamp for fallback calculation
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
  const { expiresAt, expiresInMs } = calculateExpiry(
    credentials.expiresIn,
    profile.jwtExp
  )

  return {
    ...profile,
    isAuthenticated,
    token: credentials.token,
    refreshToken: credentials.refreshToken,
    expiresIn: expiresInMs,
    expiresAt
  }
}

export { buildSessionFromProfile, buildUserProfile, calculateExpiry }

/**
 * @import { DefraIdJwtPayload } from '../types/auth.js'
 * @import { UserProfile, UserSession } from '../types/session.js'
 */
