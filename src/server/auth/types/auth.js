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
 * Defra ID JWT payload, narrowed to the claims we consume.
 *
 * Real tokens carry many more claims (Azure B2C policy fields,
 * `iss`/`aud`/`nbf`/`iat`, etc.); they're allowed through validation but not
 * declared here so the type contract reflects what the codebase actually uses.
 * Add a field here only when adding code that reads it, and validate it at the
 * `verify-token` boundary at the same time.
 *
 * For the full shape emitted by the local stub (the closest thing to an
 * executable spec), see `generateDefraIdToken` in cdp-defra-id-stub:
 * https://github.com/DEFRA/cdp-defra-id-stub/blob/main/src/server/oidc/helpers/generate-defraid-token.js
 *
 * `email` is optional because the OIDC scope we request (`openid`,
 * `offline_access` — see src/server/auth/plugins/defra-id.js) does not include
 * `email`. Defra ID's B2C policy currently maps it into the id_token by
 * default, but that's a policy decision; downstream consumers handle absence.
 * @typedef {{
 *   sub: string
 *   email?: string
 *   exp: number
 * }} DefraIdJwtPayload
 */

/**
 * Union type for Bell credentials from either OAuth provider
 * @typedef {OAuthBellCredentials | AzureB2CBellCredentials} BellCredentials
 */

/**
 * Target shape for the Bell `profile` hook in
 * `src/server/auth/plugins/defra-id.js`. At entry this is a plain
 * `BellCredentials` object supplied by `@hapi/bell`; the hook then mutates
 * it into a `UserSession` by attaching the session-specific fields declared
 * here as optional so each assignment is type-checked.
 * @typedef {(OAuthBellCredentials | AzureB2CBellCredentials) & {
 *   profile?: import('./session.js').UserProfile
 *   expiresAt?: string
 *   idToken?: string
 *   urls?: { token: string, logout: string }
 * }} BellProfileTarget
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
