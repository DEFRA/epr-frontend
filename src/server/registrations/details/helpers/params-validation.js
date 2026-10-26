import Joi from 'joi'

import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { yearParam } from '#server/common/helpers/route-params.js'

/**
 * The params of a registration's address.
 */
export const registrationParamsSchema = Joi.object({
  organisationNumber: Joi.string().pattern(/^\d+$/).required(),
  registrationNumber: Joi.string().required()
})

/**
 * The params of a registration's `{year}` address.
 */
export const yearParamsSchema = registrationParamsSchema.keys({
  year: yearParam.required()
})

/**
 * Validates an address's params. Ones the schema rejects are a 404, not a 400:
 * the address does not exist.
 * @param {Joi.ObjectSchema} params
 * @param {{ message: string, code: string, action: string, reason: string }} notFoundAs
 */
export const paramsOrNotFound = (
  params,
  { message, code, action, reason }
) => ({
  params,
  failAction: () => {
    throw notFound(message, code, { event: { action, reason } })
  }
})
