/**
 * @import { BellCredentials } from '../types/auth.js'
 */

/**
 * User profile - identity data extracted from JWT token payload
 *
 * Only includes fields actually used in production (for audit logging).
 * Other JWT claims are available but not stored as they're unused.
 * @typedef {{
 *   id: string
 *   email: string
 * }} UserProfile
 */

/**
 * Complete user session stored in cache
 * @typedef {Omit<BellCredentials, 'expiresIn' | 'token'> & {
 *   profile: UserProfile
 *   linkedOrganisationId?: string
 *   expiresAt: string
 *   idToken: string
 *   refreshToken: string
 *   urls: { token: string, logout: string }
 * }} UserSession
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
