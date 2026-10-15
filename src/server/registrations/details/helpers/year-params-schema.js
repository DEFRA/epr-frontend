import Joi from 'joi'

import {
  MAX_YEAR,
  MIN_YEAR
} from '#server/reports/helpers/period-params-schema.js'

/**
 * The params of a registration's `{year}` address. The year is bound by the
 * same range every other `{year}` address uses, so a year one accepts is not
 * one another rejects.
 */
export const yearParamsSchema = Joi.object({
  organisationNumber: Joi.string().pattern(/^\d+$/).required(),
  registrationNumber: Joi.string().required(),
  year: Joi.number().integer().min(MIN_YEAR).max(MAX_YEAR).required()
})
