/**
 * @import { BellCredentials } from '../types/auth.js'
 */

/**
 * User profile - identity data extracted from JWT token payload
 * @typedef {{
 *   id: string
 *   correlationId: string
 *   sessionId: string
 *   contactId: string
 *   serviceId: string
 *   firstName: string
 *   lastName: string
 *   displayName: string
 *   email: string
 *   uniqueReference: string
 *   loa: string
 *   aal: string
 *   enrolmentCount: number
 *   enrolmentRequestCount: number
 *   currentRelationshipId: string
 *   relationships: string[]
 *   roles: string[]
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
