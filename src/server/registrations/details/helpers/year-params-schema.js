import Joi from 'joi'

import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import {
  MAX_YEAR,
  MIN_YEAR
} from '#server/reports/helpers/period-params-schema.js'

/**
 * The params of a registration's address.
 */
export const registrationParamsSchema = Joi.object({
  organisationNumber: Joi.string().pattern(/^\d+$/).required(),
  registrationNumber: Joi.string().required()
})

/**
 * The params of a registration's `{year}` address. The year is bound by the
 * same range every other `{year}` address uses, so a year one accepts is not
 * one another rejects.
 */
export const yearParamsSchema = registrationParamsSchema.keys({
  year: Joi.number().integer().min(MIN_YEAR).max(MAX_YEAR).required()
})

/**
 * Validates a registration's address; one that does not match is a 404.
 * @param {string} message
 * @param {string} action
 */
export const registrationParamsValidation = (message, action) => ({
  params: registrationParamsSchema,
  failAction: () => {
    throw notFound(message, errorCodes.registrationNotFound, {
      event: {
        action,
        reason: 'the address holds no such organisation number'
      }
    })
  }
})
