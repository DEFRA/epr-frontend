import Joi from 'joi'

const TWO_DP_FACTOR = 100

export const maxTwoDecimalPlaces = (value, helpers) => {
  if (Math.round(value * TWO_DP_FACTOR) !== value * TWO_DP_FACTOR) {
    return helpers.error('number.maxDecimalPlaces')
  }
  return value
}

const FORMAT_ERROR = 'reports:noteSummaryErrorFormat'

export const revenuePayloadSchema = Joi.object({
  prnRevenue: Joi.number()
    .min(0)
    .custom(maxTwoDecimalPlaces)
    .required()
    .messages({
      'any.required': 'reports:noteSummaryErrorRequired',
      'number.base': 'reports:noteSummaryErrorRequired',
      'number.min': FORMAT_ERROR,
      'number.unsafe': FORMAT_ERROR,
      'number.infinity': FORMAT_ERROR,
      'number.maxDecimalPlaces': 'reports:noteSummaryErrorDecimalPlaces'
    }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

/**
 * Builds validation error objects from Joi error details, suitable for
 * govukErrorSummary and inline error display.
 * @param {Request} request
 * @param {import('joi').ValidationError} error
 * @param {Record<string, unknown>} [interpolation] - Placeholder values for i18n message keys
 * @returns {{ errors: Record<string, { text: string }>, errorSummary: { titleText: string, errorList: Array<{ text: string, href: string }> } }}
 */
export function buildValidationErrors(request, error, interpolation = {}) {
  const errors = {}
  const errorList = []

  for (const detail of error.details) {
    const field = detail.path[0]
    const message = request.t(detail.message, interpolation)
    errors[field] = { text: message }
    errorList.push({ text: message, href: `#${field}` })
  }

  return {
    errors,
    errorSummary: {
      titleText: request.t('common:errorSummaryTitle'),
      errorList
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
