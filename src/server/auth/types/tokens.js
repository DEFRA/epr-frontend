/**
 * OIDC token endpoint response, narrowed to the fields the codebase consumes.
 *
 * Validated at the boundary by `validateRefreshedTokens` in
 * `src/server/auth/helpers/refreshed-tokens-schema.js`. Additional fields the
 * provider returns (eg `access_token`, `expires_in`, `token_type`) are allowed
 * through but not declared here so the type contract reflects what we read.
 * Session expiry is derived from the JWT `exp` claim, not from `expires_in`.
 *
 * Add a field here only when adding code that reads it, and extend the Joi
 * schema at the same time.
 * @typedef {{
 *   id_token: string
 *   refresh_token: string
 * }} RefreshedTokens
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
