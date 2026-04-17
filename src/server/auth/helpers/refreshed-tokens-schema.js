import Joi from 'joi'

/**
 * @import { RefreshedTokens } from '../types/tokens.js'
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
