import Joi from 'joi'

/**
 * @import { DefraIdJwtPayload } from '../types/auth.js'
 */

const azureB2CJwtPayloadSchema = Joi.object({
  sub: Joi.string().required(),
  email: Joi.string().required(),
  correlationId: Joi.string().required(),
  sessionId: Joi.string().required(),
  contactId: Joi.string().required(),
  serviceId: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  uniqueReference: Joi.string().required(),
  loa: Joi.number().required(),
  aal: Joi.string().required(),
  enrolmentCount: Joi.number().required(),
  enrolmentRequestCount: Joi.number().required(),
  currentRelationshipId: Joi.string().required(),
  relationships: Joi.array().items(Joi.string()).required(),
  roles: Joi.array().items(Joi.string()).optional(),
  exp: Joi.number().required(),
  iat: Joi.number().required(),
  nbf: Joi.number().required(),
  iss: Joi.string().required(),
  aud: Joi.string().required(),
  ver: Joi.string().optional(),
  acr: Joi.string().optional(),
  auth_time: Joi.number().optional(),
  amr: Joi.string().optional()
}).unknown(true)

const stubJwtPayloadSchema = Joi.object({
  id: Joi.string().required(),
  sub: Joi.string().required(),
  aud: Joi.string().required(),
  iss: Joi.string().required(),
  nbf: Joi.number().required(),
  exp: Joi.number().required(),
  iat: Joi.number().required(),
  email: Joi.string().required(),
  correlationId: Joi.string().required(),
  sessionId: Joi.string().required(),
  contactId: Joi.string().required(),
  serviceId: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  uniqueReference: Joi.string().required(),
  loa: Joi.string().required(),
  aal: Joi.string().required(),
  enrolmentCount: Joi.string().required(),
  enrolmentRequestCount: Joi.string().required(),
  currentRelationshipId: Joi.string().required(),
  relationships: Joi.array().items(Joi.string()).required(),
  roles: Joi.array().items(Joi.string()).required()
}).unknown(true)

export const defraIdJwtPayloadSchema = Joi.alternatives().try(
  azureB2CJwtPayloadSchema,
  stubJwtPayloadSchema
)

/**
 * @param {unknown} payload
 * @returns {DefraIdJwtPayload}
 */
export const validateDefraIdJwtPayload = (payload) => {
  const { error, value } = defraIdJwtPayloadSchema.validate(payload, {
    abortEarly: false
  })
  if (error) {
    throw error
  }
  return value
}
