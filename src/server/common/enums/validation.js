/**
 * Backend validation error codes, cloned verbatim from epr-backend
 * `src/common/enums/validation.js` (the BE -> FE i18n contract, ADR 0020).
 *
 * This is the FE's single source of truth for validation codes: the display
 * mapping in `#server/common/constants/validation-codes.js` references these
 * constants rather than re-typing loose string literals, so a code that does
 * not exist here cannot be referenced. The full set is cloned irrespective of
 * whether the FE maps it today. Keeping this file a faithful mirror of the BE
 * enum lets a future sync check (CI/codegen) diff the two directly.
 */
export const VALIDATION_CODE = Object.freeze(
  /** @type {const} */ ({
    // Meta-level validation codes - syntax (from Joi validation)
    REGISTRATION_REQUIRED: 'REGISTRATION_REQUIRED',
    MATERIAL_REQUIRED: 'MATERIAL_REQUIRED',
    PROCESSING_TYPE_REQUIRED: 'PROCESSING_TYPE_REQUIRED',
    PROCESSING_TYPE_INVALID: 'PROCESSING_TYPE_INVALID',
    TEMPLATE_VERSION_REQUIRED: 'TEMPLATE_VERSION_REQUIRED',
    TEMPLATE_VERSION_INVALID: 'TEMPLATE_VERSION_INVALID',

    // Meta-level validation codes - business rules
    REGISTRATION_DATA_INVALID: 'REGISTRATION_DATA_INVALID',
    REGISTRATION_MISMATCH: 'REGISTRATION_MISMATCH',
    PROCESSING_TYPE_DATA_INVALID: 'PROCESSING_TYPE_DATA_INVALID',
    PROCESSING_TYPE_MISMATCH: 'PROCESSING_TYPE_MISMATCH',
    MATERIAL_DATA_INVALID: 'MATERIAL_DATA_INVALID',
    MATERIAL_MISMATCH: 'MATERIAL_MISMATCH',
    ACCREDITATION_MISSING: 'ACCREDITATION_MISSING',
    ACCREDITATION_MISMATCH: 'ACCREDITATION_MISMATCH',
    ACCREDITATION_UNEXPECTED: 'ACCREDITATION_UNEXPECTED',

    // Generic data-level codes. The backend still emits these (its Joi-error map
    // in data-syntax.js assigns them to the issue `code`) but marks them
    // @deprecated in favour of the specific field codes below for the `errorCode`
    // field; the FE maps both, so they are not annotated @deprecated here.
    TABLE_UNRECOGNISED: 'TABLE_UNRECOGNISED',
    HEADER_REQUIRED: 'HEADER_REQUIRED',
    FIELD_REQUIRED: 'FIELD_REQUIRED',
    INVALID_TYPE: 'INVALID_TYPE',
    VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_DATE: 'INVALID_DATE',
    CALCULATED_VALUE_MISMATCH: 'CALCULATED_VALUE_MISMATCH',
    SEQUENTIAL_ROW_REMOVED: 'SEQUENTIAL_ROW_REMOVED',

    // Specific field validation error codes (for errorCode field)
    MUST_BE_A_NUMBER: 'MUST_BE_A_NUMBER',
    MUST_BE_A_STRING: 'MUST_BE_A_STRING',
    MUST_BE_A_VALID_DATE: 'MUST_BE_A_VALID_DATE',
    MUST_BE_GREATER_THAN_ZERO: 'MUST_BE_GREATER_THAN_ZERO',
    MUST_BE_AT_LEAST_ZERO: 'MUST_BE_AT_LEAST_ZERO',
    MUST_BE_LESS_THAN_1: 'MUST_BE_LESS_THAN_1',
    MUST_BE_AT_MOST_1: 'MUST_BE_AT_MOST_1',
    MUST_BE_AT_MOST_1000: 'MUST_BE_AT_MOST_1000',
    MUST_BE_AT_MOST_100_CHARS: 'MUST_BE_AT_MOST_100_CHARS',
    MUST_BE_YES_OR_NO: 'MUST_BE_YES_OR_NO',
    MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS:
      'MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS',
    MUST_BE_3_DIGIT_ID: 'MUST_BE_3_DIGIT_ID',
    MUST_BE_VALID_EWC_CODE: 'MUST_BE_VALID_EWC_CODE',
    MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD:
      'MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD',
    MUST_BE_VALID_WASTE_DESCRIPTION: 'MUST_BE_VALID_WASTE_DESCRIPTION',
    MUST_BE_VALID_BASEL_CODE: 'MUST_BE_VALID_BASEL_CODE',
    MUST_BE_VALID_EXPORT_CONTROL: 'MUST_BE_VALID_EXPORT_CONTROL',
    NET_WEIGHT_CALCULATION_MISMATCH: 'NET_WEIGHT_CALCULATION_MISMATCH',
    TONNAGE_CALCULATION_MISMATCH: 'TONNAGE_CALCULATION_MISMATCH',
    UK_PACKAGING_PROPORTION_CALCULATION_MISMATCH:
      'UK_PACKAGING_PROPORTION_CALCULATION_MISMATCH',

    // File upload validation codes (from CDP Uploader rejection)
    FILE_VIRUS_DETECTED: 'FILE_VIRUS_DETECTED',
    FILE_EMPTY: 'FILE_EMPTY',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    FILE_WRONG_TYPE: 'FILE_WRONG_TYPE',
    FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
    FILE_DOWNLOAD_FAILED: 'FILE_DOWNLOAD_FAILED',
    FILE_REJECTED: 'FILE_REJECTED', // Fallback for unknown upload errors

    // Spreadsheet validation codes
    SPREADSHEET_INVALID_ERROR: 'SPREADSHEET_INVALID_ERROR', // Spreadsheet fails structural validation
    SPREADSHEET_MALFORMED_MARKERS: 'SPREADSHEET_MALFORMED_MARKERS', // Template markers are duplicated or misplaced

    // Generic/fallback codes
    VALIDATION_FALLBACK_ERROR: 'VALIDATION_FALLBACK_ERROR', // Unmapped Joi validation types
    VALIDATION_SYSTEM_ERROR: 'VALIDATION_SYSTEM_ERROR' // System failures during validation
  })
)

/** @typedef {(typeof VALIDATION_CODE)[keyof typeof VALIDATION_CODE]} ValidationCode */
