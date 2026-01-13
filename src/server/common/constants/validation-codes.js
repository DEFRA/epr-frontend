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
export const PROCESSING_TYPE_DISPLAY_CODE = 'PROCESSING_TYPE_INVALID'

export const TECHNICAL_ERROR_CODES = new Set(Object.values(technicalErrorCodes))
export const TECHNICAL_ERROR_DISPLAY_CODE = 'TECHNICAL_ERROR'

export const SPREADSHEET_CODES = new Set(Object.values(spreadsheetCodes))
export const SPREADSHEET_DISPLAY_CODE = 'SPREADSHEET_MALFORMED'
