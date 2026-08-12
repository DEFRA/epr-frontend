/**
 * @import { BellCredentials } from '../types/auth.js'
 */

/**
 * User profile - identity data extracted from JWT token payload
 *
 * Only includes fields actually used in production (for audit logging).
 * Other JWT claims are available but not stored as they're unused.
 *
 * `email` is optional because the Defra ID id_token doesn't guarantee its
 * presence (the `email` scope isn't requested — see DefraIdJwtPayload).
 *
 * access to regulator-only areas — see entra-id.js).
 * @typedef {{
 *   id: string
 *   email?: string
 * }} UserProfile
 */

/**
 * Complete user session stored in cache
 *
 * `idToken` is the OIDC id token, and the only consumer is the `id_token_hint`
 * on the provider logout URL. `backendToken` is what every backend call
 * presents: the id token for a Defra ID session, and the access token for an
 * Entra ID session, because the `roles` claim the backend resolves a regulator
 * from arrives on the access token.
 * @typedef {Omit<BellCredentials, 'expiresIn' | 'token'> & {
 *   profile: UserProfile
 *   linkedOrganisationId?: string
 *   expiresAt: string
 *   idToken: string
 *   backendToken: string
 *   refreshToken: string
 *   urls: { token: string, logout: string }
 *   idTokenRefreshInProgress?: boolean
 *   scope: string[]
 * }} UserSession
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
