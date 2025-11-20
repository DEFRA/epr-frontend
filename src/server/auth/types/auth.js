/**
 * @typedef {object} BellCredentials
 * @property {number} expiresIn - Token expiration time in seconds
 * @property {string} provider - OAuth provider name (e.g., "defra-id")
 * @property {object} query - Query parameters from the OAuth callback
 * @property {string} refreshToken - JWT refresh token
 * @property {string} token - JWT access token
 * @property {object} [profile] - User profile object (set by the profile function)
 */

/**
 * @typedef {object} OAuthTokenParams
 * @property {string} access_token - JWT access token
 * @property {number} expires_in - Token expiration time in seconds
 * @property {string} id_token - JWT ID token containing user claims
 * @property {string} refresh_token - JWT refresh token for obtaining new access tokens
 * @property {string} token_type - Token type (typically "bearer")
 */

/**
 * @typedef {object} AzureB2CTokenParams
 * @property {string} id_token - JWT ID token containing user claims
 * @property {number} id_token_expires_in - ID token expiration time in seconds
 * @property {number} not_before - Timestamp before which the token is not valid
 * @property {string} profile_info - Base64 encoded profile information
 * @property {string} refresh_token - JWT refresh token for obtaining new access tokens
 * @property {number} refresh_token_expires_in - Refresh token expiration time in seconds
 * @property {string} scope - Space-separated list of granted scopes
 * @property {string} token_type - Token type (typically "Bearer")
 */

/**
 * Defra ID JWT payload structure from Azure B2C (production/test environments)
 * @typedef {object} AzureB2CJwtPayload
 * @property {string} sub - Subject (user ID)
 * @property {string} email - User email address
 * @property {string} correlationId - Defra ID correlation identifier
 * @property {string} sessionId - Defra ID session identifier
 * @property {string} contactId - Defra contact identifier
 * @property {string} serviceId - Service identifier
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} uniqueReference - Unique reference for the user
 * @property {number} loa - Level of assurance (number in Azure B2C)
 * @property {string} aal - Authentication assurance level
 * @property {number} enrolmentCount - Number of active enrolments
 * @property {number} enrolmentRequestCount - Number of pending enrolment requests
 * @property {string} currentRelationshipId - Current active relationship ID
 * @property {string[]} relationships - Array of relationship strings (format: "relId:orgId:orgName:status:role:flags")
 * @property {string[]} [roles] - Array of role names (optional)
 * @property {number} exp - Token expiration timestamp
 * @property {number} iat - Token issued at timestamp
 * @property {number} nbf - Not before timestamp
 * @property {string} iss - Issuer (Azure B2C URL)
 * @property {string} aud - Audience (client ID)
 * @property {string} [ver] - Token version (Azure B2C specific)
 * @property {string} [acr] - Authentication context class reference (Azure B2C policy name)
 * @property {number} [auth_time] - Authentication time
 * @property {string} [amr] - Authentication methods reference
 */

/**
 * Defra ID JWT payload structure from stub (local development)
 * @typedef {object} StubJwtPayload
 * @property {string} id - User ID (stub-specific, same as sub)
 * @property {string} sub - Subject (user ID)
 * @property {string} email - User email address
 * @property {string} correlationId - Defra ID correlation identifier
 * @property {string} sessionId - Defra ID session identifier
 * @property {string} contactId - Defra contact identifier
 * @property {string} serviceId - Service identifier
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} uniqueReference - Unique reference for the user
 * @property {string} loa - Level of assurance (string in stub)
 * @property {string} aal - Authentication assurance level
 * @property {string} enrolmentCount - Number of active enrolments (string in stub)
 * @property {string} enrolmentRequestCount - Number of pending enrolment requests (string in stub)
 * @property {string} currentRelationshipId - Current active relationship ID
 * @property {string[]} relationships - Array of relationship strings (format: "idx:orgId:orgName:status:role:flags")
 * @property {string[]} roles - Array of role names
 * @property {number} iat - Token issued at timestamp
 * @property {string} iss - Issuer (stub URL)
 */

/**
 * Union type for all Defra ID JWT payload formats
 * Supports both Azure B2C (production) and stub (local dev) token structures
 * @typedef {AzureB2CJwtPayload | StubJwtPayload} DefraIdJwtPayload
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
