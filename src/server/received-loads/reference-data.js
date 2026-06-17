import ewcCodes from './enums/ewc-codes.json' with { type: 'json' }
import wasteDescriptions from './enums/waste-descriptions.json' with { type: 'json' }

/**
 * Reference data and constraints for the "received loads for reprocessing"
 * journey, mirrored from the backend summary-log table schema so the forms
 * enforce the same rules the spreadsheet upload applies on submission.
 */

export const EWC_CODES = Object.freeze(ewcCodes)
export const WASTE_DESCRIPTIONS = Object.freeze(wasteDescriptions)

export const RECYCLABLE_PROPORTION_METHODS = Object.freeze([
  'AAIG percentage',
  'Actual weight (100%)',
  'National protocol percentage',
  'S&I plan agreed methodology',
  'S&I plan agreed site-specific protocol percentage'
])

export const YES = 'Yes'
export const NO = 'No'
export const YES_NO = Object.freeze([YES, NO])

export const MIN_WEIGHT = 0
export const MAX_WEIGHT = 1000

export const MIN_PERCENTAGE = 0
export const MAX_PERCENTAGE = 100

export const MIN_DATE = '2000-01-01'
export const MAX_DATE = '2100-01-01'

export const ROW_ID_MINIMUM = 1000

export const MAX_TEXT_LENGTH = 100

/**
 * Permitted characters for free-text fields: printable ASCII plus newlines,
 * non-breaking space, soft hyphen, smart punctuation and currency signs.
 * Matches the backend free-text field schema.
 */
export const PERMITTED_TEXT_PATTERN =
  /^[\x20-\x7E\n\r ­‘’“”–—…£€]*$/

/**
 * Deduction applied to the base weight when the bailing wire protocol is used
 * (a 0.15% deduction, expressed as a multiplier).
 */
export const BAILING_WIRE_FACTOR = 0.9985
