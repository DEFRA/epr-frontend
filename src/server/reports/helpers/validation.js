import { Decimal } from 'decimal.js'
import Joi from 'joi'

const TWO_DECIMAL_PLACES = 2

/**
 * Pads a number with trailing zeros to two decimal places when a decimal point is present (e.g. 12.3 → "12.30", 150 → "150").
 * @param {number | null | undefined} value
 * @returns {string}
 */
export const padToTwoDecimalPlaces = (value) => {
  if (value !== null && value !== undefined) {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(TWO_DECIMAL_PLACES)
  }
  return ''
}

/**
 * Joi custom validator that rejects numbers with more than two decimal places.
 * Uses Decimal.js to avoid IEEE 754 floating point errors (e.g. 0.07 * 100 !== 7).
 * @param {number} value
 * @param {import('joi').CustomHelpers} helpers
 * @returns {number | import('joi').ErrorReport}
 */
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

const tonnageNotExportedErrors = Object.freeze({
  decimalPlaces: 'reports:tonnageNotExportedErrorDecimalPlaces',
  format: 'reports:tonnageNotExportedErrorFormat',
  negative: 'reports:tonnageNotExportedErrorNegative',
  required: 'reports:tonnageNotExportedErrorRequired'
})

export const tonnageNotExportedPayloadSchema = Joi.object({
  tonnageNotExported: Joi.number()
    .empty('')
    .min(0)
    .custom(maxTwoDecimalPlaces)
    .required()
    .messages({
      'any.required': tonnageNotExportedErrors.required,
      'number.base': tonnageNotExportedErrors.format,
      'number.min': tonnageNotExportedErrors.negative,
      'number.unsafe': tonnageNotExportedErrors.format,
      'number.infinity': tonnageNotExportedErrors.format,
      'number.maxDecimalPlaces': tonnageNotExportedErrors.decimalPlaces
    }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

const freeTonnageErrors = Object.freeze({
  format: 'reports:freeErrorFormat',
  negative: 'reports:freeErrorNegative',
  required: 'reports:freeErrorRequired'
})

export const freeTonnagePayloadSchema = Joi.object({
  freeTonnage: Joi.number().empty('').integer().min(0).required().messages({
    'any.required': freeTonnageErrors.required,
    'number.base': freeTonnageErrors.format,
    'number.integer': freeTonnageErrors.format,
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
 * @param {HapiRequest} request
 * @param {import('joi').ValidationError} error
 * @param {Record<string, unknown>} [interpolation] - Placeholder values for i18n message keys
 * @returns {{ errors: Record<string, { text: string }>, errorSummary: { titleText: string, errorList: Array<{ text: string, href: string }> } }}
 */
export function buildValidationErrors(request, error, interpolation = {}) {
  /** @type {Record<string, { text: string }>} */
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
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
