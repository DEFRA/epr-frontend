import Joi from 'joi'

import { CADENCE } from '../constants.js'

/**
 * @import { CadenceValue } from '../constants.js'
 */

/**
 * Shape produced by `periodParamsSchema` after Joi validation.
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   year: number,
 *   cadence: CadenceValue,
 *   period: number,
 *   submissionNumber: number
 * }} PeriodParams
 */

/**
 * The years the service will answer for at all. Exported so every route
 * carrying a `{year}` is bound the same way — a year one address accepts and
 * another rejects is worse than either bound.
 */
export const MIN_YEAR = 2024
export const MAX_YEAR = 2100
const MAX_PERIOD = 12

export const periodParamsSchema = Joi.object({
  organisationId: Joi.string().required(),
  registrationId: Joi.string().required(),
  year: Joi.number().integer().min(MIN_YEAR).max(MAX_YEAR).required(),
  cadence: Joi.string().valid(CADENCE.MONTHLY, CADENCE.QUARTERLY).required(),
  period: Joi.number().integer().min(1).max(MAX_PERIOD).required(),
  submissionNumber: Joi.number().integer().min(1).required()
})
