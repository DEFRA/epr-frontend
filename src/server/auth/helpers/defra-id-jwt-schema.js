import Joi from 'joi'

/**
 * @import { DefraIdJwtPayload } from '../types/auth.js'
 */

export const defraIdJwtPayloadSchema = Joi.object({
  sub: Joi.string().required(),
  email: Joi.string().required(),
  exp: Joi.number().required()
}).unknown(true)

/**
 * @param {unknown} payload
 * @returns {DefraIdJwtPayload}
 */
export const validateDefraIdJwtPayload = (payload) => {
  const { error, value } = defraIdJwtPayloadSchema.validate(payload, {
    abortEarly: false
  })
  if (error) {
    const details = error.details
      .map((d) => `${d.path.join('.')}: ${d.message}`)
      .join('; ')
    throw new Error(`Invalid Defra ID JWT payload: ${details}`)
  }
  return value
}
