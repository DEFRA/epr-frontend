import Joi from 'joi'

import { yearParam } from '#server/common/helpers/route-params.js'

import { CADENCE } from '../constants.js'

/**
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { CadenceValue } from '../constants.js'
 */

/**
 * Shape produced by `periodParamsSchema` after Joi validation.
 * @typedef {{
 *   organisationNumber: OrganisationNumber,
 *   registrationNumber: RegistrationNumber,
 *   year: Year,
 *   cadence: CadenceValue,
 *   period: number,
 *   submissionNumber: number
 * }} PeriodParams
 */

const MAX_PERIOD = 12

export const periodParamsSchema = Joi.object({
  organisationNumber: Joi.string().required(),
  registrationNumber: Joi.string().required(),
  year: yearParam.required(),
  cadence: Joi.string().valid(CADENCE.MONTHLY, CADENCE.QUARTERLY).required(),
  period: Joi.number().integer().min(1).max(MAX_PERIOD).required(),
  submissionNumber: Joi.number().integer().min(1).required()
})
