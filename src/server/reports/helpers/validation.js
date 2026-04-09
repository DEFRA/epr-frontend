import Joi from 'joi'

const TWO_DECIMAL_PLACES = 2
const TWO_DP_FACTOR = 10 ** TWO_DECIMAL_PLACES

export const formatRevenue = (value) => value?.toFixed(TWO_DECIMAL_PLACES)

export const maxTwoDecimalPlaces = (value, helpers) => {
  if (Math.round(value * TWO_DP_FACTOR) !== value * TWO_DP_FACTOR) {
    return helpers.error('number.maxDecimalPlaces')
  }
  return value
}

const revenueErrors = Object.freeze({
  decimalPlaces: 'reports:noteSummaryErrorDecimalPlaces',
  format: 'reports:noteSummaryErrorFormat',
  required: 'reports:noteSummaryErrorRequired'
})

export const revenuePayloadSchema = Joi.object({
  prnRevenue: Joi.number()
    .empty('')
    .min(0)
    .custom(maxTwoDecimalPlaces)
    .required()
    .messages({
      'any.required': revenueErrors.required,
      'number.base': revenueErrors.format,
      'number.min': revenueErrors.format,
      'number.unsafe': revenueErrors.format,
      'number.infinity': revenueErrors.format,
      'number.maxDecimalPlaces': revenueErrors.decimalPlaces
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
