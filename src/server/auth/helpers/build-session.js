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
 * Build user profile from JWT payload
 *
 * Only includes fields that are actually used in production:
 * - id: for audit logging
 * - email: for audit logging
 * @param {DefraIdJwtPayload} payload - JWT token payload with Defra ID claims
 * @returns {UserProfile} User profile object
 */
function buildUserProfile(payload) {
  return {
    id: payload.sub,
    email: payload.email
  }
}

export { buildUserProfile, getTokenExpiresAt }
