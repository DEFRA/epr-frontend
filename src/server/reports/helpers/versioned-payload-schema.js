import Joi from 'joi'

export const versionedPayloadSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
  crumb: Joi.string()
})
