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
 *   period: number
 * }} PeriodParams
 */

const MIN_YEAR = 2024
const MAX_YEAR = 2100
const MAX_PERIOD = 12

export const periodParamsSchema = Joi.object({
  organisationId: Joi.string().required(),
  registrationId: Joi.string().required(),
  year: Joi.number().integer().min(MIN_YEAR).max(MAX_YEAR).required(),
  cadence: Joi.string().valid(CADENCE.MONTHLY, CADENCE.QUARTERLY).required(),
  period: Joi.number().integer().min(1).max(MAX_PERIOD).required()
})
