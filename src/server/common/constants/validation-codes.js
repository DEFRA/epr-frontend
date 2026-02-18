/**
 * Validation failure codes from backend API
 * Must match codes in epr-backend/src/common/enums/validation.js
 */

const fileUploadCodes = Object.freeze({
  FILE_DOWNLOAD_FAILED: 'FILE_DOWNLOAD_FAILED',
  FILE_EMPTY: 'FILE_EMPTY',
  FILE_REJECTED: 'FILE_REJECTED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_VIRUS_DETECTED: 'FILE_VIRUS_DETECTED',
  FILE_WRONG_TYPE: 'FILE_WRONG_TYPE'
})

const templateVersionCodes = Object.freeze({
  TEMPLATE_VERSION_INVALID: 'TEMPLATE_VERSION_INVALID',
  TEMPLATE_VERSION_REQUIRED: 'TEMPLATE_VERSION_REQUIRED'
})

const rowValidationCodes = Object.freeze({
  ROW_ID_MISMATCH: 'ROW_ID_MISMATCH',
  SEQUENTIAL_ROW_REMOVED: 'SEQUENTIAL_ROW_REMOVED'
})

const systemCodes = Object.freeze({
  PROCESSING_TYPE_DATA_INVALID: 'PROCESSING_TYPE_DATA_INVALID',
  VALIDATION_SYSTEM_ERROR: 'VALIDATION_SYSTEM_ERROR',
  UNKNOWN: 'UNKNOWN'
})

const dataEntryCodes = Object.freeze({
  FIELD_REQUIRED: 'FIELD_REQUIRED',
  INVALID_TYPE: 'INVALID_TYPE',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_DATE: 'INVALID_DATE',
  CALCULATED_VALUE_MISMATCH: 'CALCULATED_VALUE_MISMATCH'
})

const materialCodes = Object.freeze({
  MATERIAL_REQUIRED: 'MATERIAL_REQUIRED',
  MATERIAL_MISMATCH: 'MATERIAL_MISMATCH',
  MATERIAL_DATA_INVALID: 'MATERIAL_DATA_INVALID'
})

const registrationCodes = Object.freeze({
  REGISTRATION_REQUIRED: 'REGISTRATION_REQUIRED',
  REGISTRATION_MISMATCH: 'REGISTRATION_MISMATCH',
  REGISTRATION_DATA_INVALID: 'REGISTRATION_DATA_INVALID'
})

const accreditationCodes = Object.freeze({
  ACCREDITATION_MISSING: 'ACCREDITATION_MISSING',
  ACCREDITATION_MISMATCH: 'ACCREDITATION_MISMATCH',
  ACCREDITATION_UNEXPECTED: 'ACCREDITATION_UNEXPECTED'
})

const structureCodes = Object.freeze({
  HEADER_REQUIRED: 'HEADER_REQUIRED',
  TABLE_UNRECOGNISED: 'TABLE_UNRECOGNISED'
})

const spreadsheetCodes = Object.freeze({
  SPREADSHEET_INVALID_ERROR: 'SPREADSHEET_INVALID_ERROR',
  SPREADSHEET_MALFORMED_MARKERS: 'SPREADSHEET_MALFORMED_MARKERS'
})

const processingTypeCodes = Object.freeze({
  PROCESSING_TYPE_INVALID: 'PROCESSING_TYPE_INVALID',
  PROCESSING_TYPE_MISMATCH: 'PROCESSING_TYPE_MISMATCH',
  PROCESSING_TYPE_REQUIRED: 'PROCESSING_TYPE_REQUIRED'
})

/**
 * Technical error codes - service failures that the user cannot fix.
 * These are mapped to a generic "try again later" message.
 */
const technicalErrorCodes = Object.freeze({
  FILE_DOWNLOAD_FAILED: 'FILE_DOWNLOAD_FAILED',
  FILE_REJECTED: 'FILE_REJECTED',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  VALIDATION_SYSTEM_ERROR: 'VALIDATION_SYSTEM_ERROR',
  UNKNOWN: 'UNKNOWN'
})

export const validationFailureCodes = Object.freeze({
  ...fileUploadCodes,
  ...templateVersionCodes,
  ...rowValidationCodes,
  ...systemCodes,
  ...dataEntryCodes,
  ...materialCodes,
  ...registrationCodes,
  ...accreditationCodes,
  ...structureCodes,
  ...spreadsheetCodes,
  ...processingTypeCodes
})

export const DATA_ENTRY_CODES = new Set(Object.values(dataEntryCodes))
export const DATA_ENTRY_DISPLAY_CODE = 'DATA_ENTRY_INVALID'

export const MATERIAL_CODES = new Set(Object.values(materialCodes))
export const MATERIAL_DISPLAY_CODE = 'MATERIAL_INVALID'

export const REGISTRATION_CODES = new Set(Object.values(registrationCodes))
export const REGISTRATION_DISPLAY_CODE = 'REGISTRATION_INVALID'

export const ACCREDITATION_CODES = new Set(Object.values(accreditationCodes))
export const ACCREDITATION_DISPLAY_CODE = 'ACCREDITATION_INVALID'

export const STRUCTURE_CODES = new Set(Object.values(structureCodes))
export const STRUCTURE_DISPLAY_CODE = 'STRUCTURE_INVALID'

export const PROCESSING_TYPE_CODES = new Set(Object.values(processingTypeCodes))
export const PROCESSING_TYPE_DISPLAY_CODE = 'TEMPLATE_INVALID'

export const TECHNICAL_ERROR_CODES = new Set(Object.values(technicalErrorCodes))
export const TECHNICAL_ERROR_DISPLAY_CODE = 'TECHNICAL_ERROR'

export const SPREADSHEET_CODES = new Set(Object.values(spreadsheetCodes))
export const SPREADSHEET_DISPLAY_CODE = 'TEMPLATE_INVALID'

export const WEIGHT_HEADERS = new Set([
  'GROSS_WEIGHT',
  'TARE_WEIGHT',
  'PALLET_WEIGHT',
  'NET_WEIGHT',
  'WEIGHT_OF_NON_TARGET_MATERIALS'
])

export const WEIGHT_NUMERIC_ERROR_CODES = new Set([
  'MUST_BE_A_NUMBER',
  'MUST_BE_GREATER_THAN_ZERO',
  'MUST_BE_AT_LEAST_ZERO',
  'MUST_BE_AT_MOST_1000'
])

export const DATE_HEADERS = new Set([
  'DATE_LOAD_LEFT_SITE',
  'DATE_RECEIVED_FOR_REPROCESSING',
  'DATE_RECEIVED_FOR_EXPORT',
  'DATE_OF_EXPORT'
])

export const YES_NO_HEADERS = new Set([
  'ADD_PRODUCT_WEIGHT',
  'WERE_PRN_OR_PERN_ISSUED_ON_THIS_WASTE',
  'BAILING_WIRE_PROTOCOL',
  'DID_WASTE_PASS_THROUGH_AN_INTERIM_SITE'
])

export const CALCULATED_FIELD_MISMATCH = 'CALCULATED_FIELD_MISMATCH'
export const WEIGHT_FORMAT_INVALID = 'WEIGHT_FORMAT_INVALID'
export const DATE_FORMAT_INVALID = 'DATE_FORMAT_INVALID'
export const YES_NO_FORMAT_INVALID = 'YES_NO_FORMAT_INVALID'

export const getDisplayCodeFromErrorCode = (errorCode, header) => {
  if (errorCode === 'NET_WEIGHT_CALCULATION_MISMATCH') {
    return CALCULATED_FIELD_MISMATCH
  }

  if (WEIGHT_NUMERIC_ERROR_CODES.has(errorCode) && WEIGHT_HEADERS.has(header)) {
    return WEIGHT_FORMAT_INVALID
  }

  if (errorCode === 'MUST_BE_A_VALID_DATE' && DATE_HEADERS.has(header)) {
    return DATE_FORMAT_INVALID
  }

  if (errorCode === 'MUST_BE_YES_OR_NO' && YES_NO_HEADERS.has(header)) {
    return YES_NO_FORMAT_INVALID
  }

  return null
}
