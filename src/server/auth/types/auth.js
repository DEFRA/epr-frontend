/**
 * Bell credentials from standard OAuth2 provider (e.g., Defra ID stub)
 * @typedef {{
 *   provider: string
 *   query: Record<string, string>
 *   token: string
 *   refreshToken: string
 *   expiresIn: number
 * }} OAuthBellCredentials
 */

/**
 * Bell credentials from Azure B2C (Defra ID production/test)
 * Azure B2C doesn't return an access_token, so token and expiresIn are undefined
 * @typedef {{
 *   provider: string
 *   query: Record<string, string>
 *   token: undefined
 *   refreshToken: string
 *   expiresIn: undefined
 * }} AzureB2CBellCredentials
 */

/**
 * Token response from standard OAuth2 provider (e.g., Defra ID stub)
 * @typedef {{
 *   access_token: string
 *   expires_in: number
 *   id_token: string
 *   refresh_token: string
 *   token_type: string
 * }} OAuthTokenParams
 */

/**
 * Token response from Azure B2C (Defra ID production/test)
 * @typedef {{
 *   id_token: string
 *   id_token_expires_in: number
 *   not_before: number
 *   profile_info: string
 *   refresh_token: string
 *   refresh_token_expires_in: number
 *   scope: string
 *   token_type: string
 * }} AzureB2CTokenParams
 */

/**
 * Defra ID JWT payload structure from Azure B2C (production/test environments)
 * @typedef {{
 *   sub: string
 *   email: string
 *   correlationId: string
 *   sessionId: string
 *   contactId: string
 *   serviceId: string
 *   firstName: string
 *   lastName: string
 *   uniqueReference: string
 *   loa: number
 *   aal: string
 *   enrolmentCount: number
 *   enrolmentRequestCount: number
 *   currentRelationshipId: string
 *   relationships: string[]
 *   roles?: string[]
 *   exp: number
 *   iat: number
 *   nbf: number
 *   iss: string
 *   aud: string
 *   ver?: string
 *   acr?: string
 *   auth_time?: number
 *   amr?: string
 * }} AzureB2CJwtPayload
 */

/**
 * Defra ID JWT payload structure from stub (local development)
 * @typedef {{
 *   id: string
 *   sub: string
 *   aud: string
 *   iss: string
 *   nbf: number
 *   exp: number
 *   iat: number
 *   email: string
 *   correlationId: string
 *   sessionId: string
 *   contactId: string
 *   serviceId: string
 *   firstName: string
 *   lastName: string
 *   uniqueReference: string
 *   loa: string
 *   aal: string
 *   enrolmentCount: string
 *   enrolmentRequestCount: string
 *   currentRelationshipId: string
 *   relationships: string[]
 *   roles: string[]
 * }} StubJwtPayload
 */

/**
 * Union type for all Defra ID JWT payload formats
 * Supports both Azure B2C (production) and stub (local dev) token structures
 * @typedef {AzureB2CJwtPayload | StubJwtPayload} DefraIdJwtPayload
 */

/**
 * Union type for Bell credentials from either OAuth provider
 * @typedef {OAuthBellCredentials | AzureB2CBellCredentials} BellCredentials
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
