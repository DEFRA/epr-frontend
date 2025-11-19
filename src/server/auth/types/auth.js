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

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
