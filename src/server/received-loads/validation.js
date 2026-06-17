import Joi from 'joi'
import {
  EWC_CODES,
  WASTE_DESCRIPTIONS,
  RECYCLABLE_PROPORTION_METHODS,
  MIN_WEIGHT,
  MAX_WEIGHT,
  MIN_PERCENTAGE,
  MAX_PERCENTAGE,
  MAX_TEXT_LENGTH,
  PERMITTED_TEXT_PATTERN
} from './reference-data.js'

/**
 * The CSRF crumb and the optional "from=check" marker accompany every form
 * post, so each step schema allows them.
 */
const meta = {
  crumb: Joi.string().optional(),
  from: Joi.string().valid('check').optional()
}

/**
 * A weight in tonnes: required, numeric, 0-1000. Mirrors the backend weight
 * field schema.
 * @param {string} noun
 */
const weight = (noun) =>
  Joi.number().empty('').min(MIN_WEIGHT).max(MAX_WEIGHT).required().messages({
    'any.required': `Enter the ${noun} in tonnes`,
    'number.base': `The ${noun} must be a number`,
    'number.min': `The ${noun} must be ${MIN_WEIGHT} tonnes or more`,
    'number.max': `The ${noun} must be ${MAX_WEIGHT} tonnes or less`
  })

/**
 * A required dropdown whose allowed values come from a reference list.
 * @param {readonly string[]} values
 * @param {string} requiredMessage
 * @param {string} invalidMessage
 */
const choice = (values, requiredMessage, invalidMessage) =>
  Joi.string()
    .empty('')
    .valid(...values)
    .required()
    .messages({
      'any.required': requiredMessage,
      'any.only': invalidMessage
    })

/**
 * An optional free-text field: trimmed, length-capped, permitted characters
 * only. Mirrors the backend free-text field schema.
 * @param {string} noun
 */
const freeText = (noun) =>
  Joi.string()
    .trim()
    .allow('')
    .max(MAX_TEXT_LENGTH)
    .pattern(PERMITTED_TEXT_PATTERN)
    .messages({
      'string.max': `The ${noun} must be ${MAX_TEXT_LENGTH} characters or fewer`,
      'string.pattern.base': `The ${noun} contains characters that are not allowed`
    })

/**
 * Date parts are validated together in code (see validateDate), so the schema
 * only needs to let them and the meta fields through.
 */
export const dateReceivedSchema = Joi.object({
  'dateReceived-day': Joi.any(),
  'dateReceived-month': Joi.any(),
  'dateReceived-year': Joi.any(),
  ...meta
})

export const wasteTypeSchema = Joi.object({
  ewcCode: choice(
    EWC_CODES,
    'Select the EWC code for this waste',
    'Select a valid EWC code'
  ),
  wasteDescription: choice(
    WASTE_DESCRIPTIONS,
    'Select the description that best matches this waste',
    'Select a valid waste description'
  ),
  ...meta
})

export const prnIssuedSchema = Joi.object({
  prnIssued: choice(
    ['Yes', 'No'],
    'Select whether a PRN or PERN was issued on this waste',
    'Select whether a PRN or PERN was issued on this waste'
  ),
  ...meta
})

export const weightsSchema = Joi.object({
  grossWeight: weight('gross weight'),
  tareWeight: weight('tare weight'),
  palletWeight: weight('pallet weight'),
  ...meta
})

export const recyclabilitySchema = Joi.object({
  bailingWireProtocol: choice(
    ['Yes', 'No'],
    'Select whether the bailing wire protocol was applied',
    'Select whether the bailing wire protocol was applied'
  ),
  calculationMethod: choice(
    RECYCLABLE_PROPORTION_METHODS,
    'Select how you calculated the recyclable proportion',
    'Select a valid calculation method'
  ),
  nonTargetWeight: weight('weight of non-target materials'),
  recyclablePercentage: Joi.number()
    .empty('')
    .min(MIN_PERCENTAGE)
    .max(MAX_PERCENTAGE)
    .required()
    .messages({
      'any.required': 'Enter the recyclable proportion as a percentage',
      'number.base': 'The recyclable proportion must be a number',
      'number.min': `The recyclable proportion must be ${MIN_PERCENTAGE}% or more`,
      'number.max': `The recyclable proportion must be ${MAX_PERCENTAGE}% or less`
    }),
  ...meta
})

export const supplierSchema = Joi.object({
  supplierName: freeText('supplier name'),
  supplierAddress: freeText('supplier address'),
  supplierPostcode: freeText('supplier postcode'),
  supplierEmail: freeText('supplier email address'),
  supplierPhone: freeText('supplier phone number'),
  activitiesCarriedOut: freeText('activities carried out by the supplier'),
  ...meta
})

export const carrierSchema = Joi.object({
  carrierName: freeText('carrier name'),
  cbdRegNumber: freeText('CBD registration number'),
  vehicleRegistration: freeText('vehicle registration number'),
  weighbridgeTicket: freeText('weighbridge ticket number'),
  yourReference: freeText('reference'),
  ...meta
})

export const checkSchema = Joi.object({ ...meta })

const MIN_YEAR = 2000
const MAX_YEAR = 2100

/**
 * Validates the three date parts and composes them into a YYYY-MM-DD string.
 * Mirrors the backend calendar-date rule (a real date between 2000 and 2100).
 *
 * @param {Record<string, string>} payload
 * @returns {{ value: string } | { error: string }}
 */
export const validateDate = (payload) => {
  const day = (payload['dateReceived-day'] ?? '').trim()
  const month = (payload['dateReceived-month'] ?? '').trim()
  const year = (payload['dateReceived-year'] ?? '').trim()

  if (day === '' && month === '' && year === '') {
    return { error: 'Enter the date the waste was received for reprocessing' }
  }

  if (day === '' || month === '' || year === '') {
    return { error: 'The date must include a day, month and year' }
  }

  if (![day, month, year].every((part) => /^\d+$/.test(part))) {
    return { error: 'The date must be a real date' }
  }

  const dayNum = Number(day)
  const monthNum = Number(month)
  const yearNum = Number(year)

  const composed = new Date(Date.UTC(yearNum, monthNum - 1, dayNum))
  const isRealDate =
    composed.getUTCFullYear() === yearNum &&
    composed.getUTCMonth() === monthNum - 1 &&
    composed.getUTCDate() === dayNum

  if (!isRealDate) {
    return { error: 'The date must be a real date' }
  }

  if (yearNum < MIN_YEAR || yearNum >= MAX_YEAR) {
    return { error: `The year must be between ${MIN_YEAR} and ${MAX_YEAR}` }
  }

  const pad = (/** @type {number} */ value) => String(value).padStart(2, '0')
  return { value: `${yearNum}-${pad(monthNum)}-${pad(dayNum)}` }
}
