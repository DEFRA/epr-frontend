import Joi from 'joi'

/**
 * OIDC token endpoint response, narrowed to the fields the codebase consumes.
 *
 * Additional fields the provider returns (eg `access_token`, `expires_in`,
 * `token_type`) are allowed through by the schema below but not declared here
 * so the type contract reflects what we read. Session expiry is derived from
 * the JWT `exp` claim, not from `expires_in`.
 *
 * Add a field to the typedef and schema together — they are kept in this file
 * precisely to make that coupling structural.
 * @typedef {{
 *   id_token: string
 *   refresh_token: string
 * }} RefreshedTokens
 */

export const refreshedTokensSchema = Joi.object({
  id_token: Joi.string().required(),
  refresh_token: Joi.string().required()
}).unknown(true)

/**
 * @param {unknown} payload
 * @returns {RefreshedTokens}
 */
export const validateRefreshedTokens = (payload) => {
  const { error, value } = refreshedTokensSchema.validate(payload, {
    abortEarly: false
  })
  if (error) {
    const details = error.details
      .map((d) => `${d.path.join('.')}: ${d.message}`)
      .join('; ')
    throw new Error(`Invalid refreshed tokens: ${details}`)
  }
  return value
}
