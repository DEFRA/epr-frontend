/**
 * User profile extracted from JWT token payload
 * @typedef {object} UserProfile
 * @property {string} id - User ID (from JWT sub claim)
 * @property {string} correlationId
 * @property {string} sessionId
 * @property {string} contactId
 * @property {string} serviceId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} displayName
 * @property {string} email
 * @property {string} uniqueReference
 * @property {string} loa - Level of assurance
 * @property {string} aal - Authentication assurance level
 * @property {number} enrolmentCount
 * @property {number} enrolmentRequestCount
 * @property {string} currentRelationshipId
 * @property {string[]} relationships
 * @property {string[]} roles
 * @property {string} idToken
 * @property {string} tokenUrl - OIDC token endpoint URL
 * @property {string} logoutUrl - OIDC logout endpoint URL
 * @property {number} [jwtExp] - JWT exp claim (Unix timestamp) for fallback expiry calculation
 */

/**
 * Complete user session stored in cache
 * @typedef {object} UserSession
 * @property {string} id - User ID (from JWT sub claim)
 * @property {string} correlationId
 * @property {string} sessionId
 * @property {string} contactId
 * @property {string} serviceId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} displayName
 * @property {string} email
 * @property {string} uniqueReference
 * @property {string} loa - Level of assurance
 * @property {string} aal - Authentication assurance level
 * @property {number} enrolmentCount
 * @property {number} enrolmentRequestCount
 * @property {string} currentRelationshipId
 * @property {string[]} relationships
 * @property {string[]} roles
 * @property {boolean} isAuthenticated
 * @property {string} idToken
 * @property {string} token - Access token
 * @property {string} refreshToken
 * @property {number} expiresIn - Expiry duration in milliseconds
 * @property {string} expiresAt - ISO date string
 * @property {string} tokenUrl - OIDC token endpoint URL
 * @property {string} logoutUrl - OIDC logout endpoint URL
 * @property {string} [linkedOrganisationId] - ID of the user's linked organisation (set after auth/linking)
 * @property {number} [jwtExp] - JWT exp claim (Unix timestamp) for fallback expiry calculation
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
