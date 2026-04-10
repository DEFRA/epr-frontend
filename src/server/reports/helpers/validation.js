import Decimal from 'decimal.js'
import Joi from 'joi'

const TWO_DECIMAL_PLACES = 2

/**
 * Formats a number as a string with exactly two decimal places, for
 * pre-filling form inputs so trailing zeros are preserved (e.g. 12.3 → "12.30").
 * @param {number | null | undefined} value
 * @returns {string | undefined}
 */
export const formatToTwoDecimalPlaces = (value) =>
  value?.toFixed(TWO_DECIMAL_PLACES)

export const maxTwoDecimalPlaces = (value, helpers) => {
  if (new Decimal(value).decimalPlaces() > TWO_DECIMAL_PLACES) {
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

const tonnageRecycledErrors = Object.freeze({
  decimalPlaces: 'reports:tonnageRecycledErrorDecimalPlaces',
  format: 'reports:tonnageRecycledErrorFormat',
  negative: 'reports:tonnageRecycledErrorNegative',
  required: 'reports:tonnageRecycledErrorRequired'
})

export const tonnageRecycledPayloadSchema = Joi.object({
  tonnageRecycled: Joi.number()
    .empty('')
    .min(0)
    .custom(maxTwoDecimalPlaces)
    .required()
    .messages({
      'any.required': tonnageRecycledErrors.required,
      'number.base': tonnageRecycledErrors.format,
      'number.min': tonnageRecycledErrors.negative,
      'number.unsafe': tonnageRecycledErrors.format,
      'number.infinity': tonnageRecycledErrors.format,
      'number.maxDecimalPlaces': tonnageRecycledErrors.decimalPlaces
    }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const tonnageNotRecycledErrors = Object.freeze({
  decimalPlaces: 'reports:tonnageNotRecycledErrorDecimalPlaces',
  format: 'reports:tonnageNotRecycledErrorFormat',
  negative: 'reports:tonnageNotRecycledErrorNegative',
  required: 'reports:tonnageNotRecycledErrorRequired'
})

export const tonnageNotRecycledPayloadSchema = Joi.object({
  tonnageNotRecycled: Joi.number()
    .empty('')
    .min(0)
    .custom(maxTwoDecimalPlaces)
    .required()
    .messages({
      'any.required': tonnageNotRecycledErrors.required,
      'number.base': tonnageNotRecycledErrors.format,
      'number.min': tonnageNotRecycledErrors.negative,
      'number.unsafe': tonnageNotRecycledErrors.format,
      'number.infinity': tonnageNotRecycledErrors.format,
      'number.maxDecimalPlaces': tonnageNotRecycledErrors.decimalPlaces
    }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const freeTonnageErrors = Object.freeze({
  format: 'reports:freeErrorFormat',
  integer: 'reports:freeErrorInteger',
  negative: 'reports:freeErrorNegative',
  required: 'reports:freeErrorRequired'
})

export const freeTonnagePayloadSchema = Joi.object({
  freeTonnage: Joi.number().integer().min(0).required().messages({
    'any.required': freeTonnageErrors.required,
    'number.base': freeTonnageErrors.required,
    'number.integer': freeTonnageErrors.integer,
    'number.min': freeTonnageErrors.negative,
    'number.unsafe': freeTonnageErrors.format,
    'number.infinity': freeTonnageErrors.format
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
