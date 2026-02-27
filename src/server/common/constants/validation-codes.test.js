import { describe, expect, test } from 'vitest'

import { getDisplayCodeFromErrorCode } from './validation-codes.js'

describe('#getDisplayCodeFromErrorCode', () => {
  test('returns CALCULATED_FIELD_MISMATCH for NET_WEIGHT_CALCULATION_MISMATCH with NET_WEIGHT header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'NET_WEIGHT_CALCULATION_MISMATCH',
        'NET_WEIGHT'
      )
    ).toBe('CALCULATED_FIELD_MISMATCH')
  })

  test('returns CALCULATED_FIELD_MISMATCH for TONNAGE_CALCULATION_MISMATCH with TONNAGE_RECEIVED_FOR_RECYCLING header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'TONNAGE_CALCULATION_MISMATCH',
        'TONNAGE_RECEIVED_FOR_RECYCLING'
      )
    ).toBe('CALCULATED_FIELD_MISMATCH')
  })

  test('returns CALCULATED_FIELD_MISMATCH for UK_PACKAGING_PROPORTION_CALCULATION_MISMATCH with PRODUCT_UK_PACKAGING_WEIGHT_PROPORTION header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'UK_PACKAGING_PROPORTION_CALCULATION_MISMATCH',
        'PRODUCT_UK_PACKAGING_WEIGHT_PROPORTION'
      )
    ).toBe('CALCULATED_FIELD_MISMATCH')
  })

  test('returns CALCULATED_FIELD_MISMATCH for TONNAGE_CALCULATION_MISMATCH with TONNAGE_RECEIVED_FOR_EXPORT header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'TONNAGE_CALCULATION_MISMATCH',
        'TONNAGE_RECEIVED_FOR_EXPORT'
      )
    ).toBe('CALCULATED_FIELD_MISMATCH')
  })

  test('returns CALCULATED_FIELD_MISMATCH for NET_WEIGHT_CALCULATION_MISMATCH with non-calculated header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'NET_WEIGHT_CALCULATION_MISMATCH',
        'GROSS_WEIGHT'
      )
    ).toBe('CALCULATED_FIELD_MISMATCH')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_A_NUMBER with GROSS_WEIGHT header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_A_NUMBER', 'GROSS_WEIGHT')
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_AT_LEAST_ZERO with TARE_WEIGHT header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_AT_LEAST_ZERO', 'TARE_WEIGHT')
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_GREATER_THAN_ZERO with PALLET_WEIGHT header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_GREATER_THAN_ZERO', 'PALLET_WEIGHT')
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_AT_MOST_1000 with WEIGHT_OF_NON_TARGET_MATERIALS header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_AT_MOST_1000',
        'WEIGHT_OF_NON_TARGET_MATERIALS'
      )
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_AT_LEAST_ZERO with PRODUCT_TONNAGE header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_AT_LEAST_ZERO', 'PRODUCT_TONNAGE')
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_AT_MOST_1000 with TONNAGE_OF_UK_PACKAGING_WASTE_EXPORTED header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_AT_MOST_1000',
        'TONNAGE_OF_UK_PACKAGING_WASTE_EXPORTED'
      )
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_AT_LEAST_ZERO with TONNAGE_RECEIVED_FOR_RECYCLING header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_AT_LEAST_ZERO',
        'TONNAGE_RECEIVED_FOR_RECYCLING'
      )
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_AT_LEAST_ZERO with TONNAGE_RECEIVED_FOR_EXPORT header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_AT_LEAST_ZERO',
        'TONNAGE_RECEIVED_FOR_EXPORT'
      )
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_AT_MOST_1000 with PRODUCT_UK_PACKAGING_WEIGHT_PROPORTION header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_AT_MOST_1000',
        'PRODUCT_UK_PACKAGING_WEIGHT_PROPORTION'
      )
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns WEIGHT_FORMAT_INVALID for MUST_BE_A_NUMBER with TONNAGE_RECEIVED_FOR_RECYCLING header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_A_NUMBER',
        'TONNAGE_RECEIVED_FOR_RECYCLING'
      )
    ).toBe('WEIGHT_FORMAT_INVALID')
  })

  test('returns DATE_FORMAT_INVALID for MUST_BE_A_VALID_DATE with DATE_LOAD_LEFT_SITE header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_A_VALID_DATE', 'DATE_LOAD_LEFT_SITE')
    ).toBe('DATE_FORMAT_INVALID')
  })

  test('returns DATE_FORMAT_INVALID for MUST_BE_A_VALID_DATE with DATE_OF_EXPORT header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_A_VALID_DATE', 'DATE_OF_EXPORT')
    ).toBe('DATE_FORMAT_INVALID')
  })

  test('returns DATA_ENTRY_INVALID for MUST_BE_A_VALID_DATE with non-date header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_A_VALID_DATE', 'NET_WEIGHT')
    ).toBe('DATA_ENTRY_INVALID')
  })

  test('returns YES_NO_FORMAT_INVALID for MUST_BE_YES_OR_NO with ADD_PRODUCT_WEIGHT header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_YES_OR_NO', 'ADD_PRODUCT_WEIGHT')
    ).toBe('YES_NO_FORMAT_INVALID')
  })

  test('returns YES_NO_FORMAT_INVALID for MUST_BE_YES_OR_NO with BAILING_WIRE_PROTOCOL header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_YES_OR_NO', 'BAILING_WIRE_PROTOCOL')
    ).toBe('YES_NO_FORMAT_INVALID')
  })

  test('returns DATA_ENTRY_INVALID for MUST_BE_YES_OR_NO with non-yes-no header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_YES_OR_NO', 'GROSS_WEIGHT')
    ).toBe('DATA_ENTRY_INVALID')
  })

  test('returns DROPDOWN_FORMAT_INVALID for MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD with dropdown header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD',
        'HOW_DID_YOU_CALCULATE_RECYCLABLE_PROPORTION'
      )
    ).toBe('DROPDOWN_FORMAT_INVALID')
  })

  test('returns DROPDOWN_FORMAT_INVALID for MUST_BE_VALID_EWC_CODE with EWC_CODE header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_VALID_EWC_CODE', 'EWC_CODE')
    ).toBe('DROPDOWN_FORMAT_INVALID')
  })

  test('returns DROPDOWN_FORMAT_INVALID for MUST_BE_VALID_BASEL_CODE with BASEL_EXPORT_CODE header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_VALID_BASEL_CODE',
        'BASEL_EXPORT_CODE'
      )
    ).toBe('DROPDOWN_FORMAT_INVALID')
  })

  test('returns DROPDOWN_FORMAT_INVALID for MUST_BE_VALID_WASTE_DESCRIPTION with DESCRIPTION_WASTE header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_VALID_WASTE_DESCRIPTION',
        'DESCRIPTION_WASTE'
      )
    ).toBe('DROPDOWN_FORMAT_INVALID')
  })

  test('returns DATA_ENTRY_INVALID for MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD with non-dropdown header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD',
        'GROSS_WEIGHT'
      )
    ).toBe('DATA_ENTRY_INVALID')
  })

  test('returns FREE_TEXT_INVALID for MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS with CONTAINER_NUMBER header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS',
        'CONTAINER_NUMBER'
      )
    ).toBe('FREE_TEXT_INVALID')
  })

  test('returns FREE_TEXT_INVALID for MUST_BE_AT_MOST_100_CHARS with CUSTOMS_CODES header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_AT_MOST_100_CHARS', 'CUSTOMS_CODES')
    ).toBe('FREE_TEXT_INVALID')
  })

  test('returns DATA_ENTRY_INVALID for MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS with non-free-text header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS',
        'GROSS_WEIGHT'
      )
    ).toBe('DATA_ENTRY_INVALID')
  })

  test('returns ID_FORMAT_INVALID for MUST_BE_3_DIGIT_NUMBER with OSR_ID header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_3_DIGIT_NUMBER', 'OSR_ID')
    ).toBe('ID_FORMAT_INVALID')
  })

  test('returns ID_FORMAT_INVALID for MUST_BE_3_DIGIT_NUMBER with INTERIM_SITE_ID header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_3_DIGIT_NUMBER', 'INTERIM_SITE_ID')
    ).toBe('ID_FORMAT_INVALID')
  })

  test('returns DATA_ENTRY_INVALID for MUST_BE_3_DIGIT_NUMBER with non-ID header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_3_DIGIT_NUMBER', 'GROSS_WEIGHT')
    ).toBe('DATA_ENTRY_INVALID')
  })

  test('returns PERCENTAGE_FORMAT_INVALID for MUST_BE_AT_LEAST_ZERO with UK_PACKAGING_WEIGHT_PERCENTAGE header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_AT_LEAST_ZERO',
        'UK_PACKAGING_WEIGHT_PERCENTAGE'
      )
    ).toBe('PERCENTAGE_FORMAT_INVALID')
  })

  test('returns PERCENTAGE_FORMAT_INVALID for MUST_BE_AT_MOST_1 with UK_PACKAGING_WEIGHT_PERCENTAGE header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_AT_MOST_1',
        'UK_PACKAGING_WEIGHT_PERCENTAGE'
      )
    ).toBe('PERCENTAGE_FORMAT_INVALID')
  })

  test('returns PERCENTAGE_FORMAT_INVALID for MUST_BE_LESS_THAN_1 with RECYCLABLE_PROPORTION_PERCENTAGE header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_LESS_THAN_1',
        'RECYCLABLE_PROPORTION_PERCENTAGE'
      )
    ).toBe('PERCENTAGE_FORMAT_INVALID')
  })

  test('returns DATA_ENTRY_INVALID for MUST_BE_AT_MOST_100_CHARS with non-free-text header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_AT_MOST_100_CHARS', 'GROSS_WEIGHT')
    ).toBe('DATA_ENTRY_INVALID')
  })

  test('returns DROPDOWN_FORMAT_INVALID for MUST_BE_VALID_EXPORT_CONTROL with EXPORT_CONTROLS header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_VALID_EXPORT_CONTROL',
        'EXPORT_CONTROLS'
      )
    ).toBe('DROPDOWN_FORMAT_INVALID')
  })

  test('returns YES_NO_FORMAT_INVALID for MUST_BE_A_STRING with yes/no header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_A_STRING', 'ADD_PRODUCT_WEIGHT')
    ).toBe('YES_NO_FORMAT_INVALID')
  })

  test('returns DROPDOWN_FORMAT_INVALID for MUST_BE_A_STRING with dropdown header', () => {
    expect(getDisplayCodeFromErrorCode('MUST_BE_A_STRING', 'EWC_CODE')).toBe(
      'DROPDOWN_FORMAT_INVALID'
    )
  })

  test('returns DATA_ENTRY_INVALID for MUST_BE_A_STRING with unrecognised header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_A_STRING', 'GROSS_WEIGHT')
    ).toBe('DATA_ENTRY_INVALID')
  })

  test('returns CALCULATED_FIELD_MISMATCH for TONNAGE_CALCULATION_MISMATCH with unrecognised header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'TONNAGE_CALCULATION_MISMATCH',
        'SOME_UNKNOWN_HEADER'
      )
    ).toBe('CALCULATED_FIELD_MISMATCH')
  })

  test('returns CALCULATED_FIELD_MISMATCH for UK_PACKAGING_PROPORTION_CALCULATION_MISMATCH with unrecognised header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'UK_PACKAGING_PROPORTION_CALCULATION_MISMATCH',
        'SOME_UNKNOWN_HEADER'
      )
    ).toBe('CALCULATED_FIELD_MISMATCH')
  })

  test('returns DATA_ENTRY_INVALID for MUST_BE_LESS_THAN_1 with unrecognised header (safety net)', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_LESS_THAN_1', 'SOME_UNKNOWN_HEADER')
    ).toBe('DATA_ENTRY_INVALID')
  })

  test('returns TECHNICAL_ERROR for VALIDATION_FALLBACK_ERROR', () => {
    expect(
      getDisplayCodeFromErrorCode('VALIDATION_FALLBACK_ERROR', undefined)
    ).toBe('TECHNICAL_ERROR')
  })

  test('returns TECHNICAL_ERROR for VALIDATION_SYSTEM_ERROR', () => {
    expect(
      getDisplayCodeFromErrorCode('VALIDATION_SYSTEM_ERROR', undefined)
    ).toBe('TECHNICAL_ERROR')
  })

  test('returns TECHNICAL_ERROR for FILE_UPLOAD_FAILED', () => {
    expect(getDisplayCodeFromErrorCode('FILE_UPLOAD_FAILED', undefined)).toBe(
      'TECHNICAL_ERROR'
    )
  })

  test('returns TECHNICAL_ERROR for UNKNOWN', () => {
    expect(getDisplayCodeFromErrorCode('UNKNOWN', undefined)).toBe(
      'TECHNICAL_ERROR'
    )
  })

  test('returns DATA_ENTRY_INVALID for FIELD_REQUIRED', () => {
    expect(getDisplayCodeFromErrorCode('FIELD_REQUIRED', undefined)).toBe(
      'DATA_ENTRY_INVALID'
    )
  })

  test('returns DATA_ENTRY_INVALID for INVALID_TYPE', () => {
    expect(getDisplayCodeFromErrorCode('INVALID_TYPE', undefined)).toBe(
      'DATA_ENTRY_INVALID'
    )
  })

  test('returns MATERIAL_INVALID for MATERIAL_MISMATCH', () => {
    expect(getDisplayCodeFromErrorCode('MATERIAL_MISMATCH', undefined)).toBe(
      'MATERIAL_INVALID'
    )
  })

  test('returns REGISTRATION_INVALID for REGISTRATION_MISMATCH', () => {
    expect(
      getDisplayCodeFromErrorCode('REGISTRATION_MISMATCH', undefined)
    ).toBe('REGISTRATION_INVALID')
  })

  test('returns ACCREDITATION_INVALID for ACCREDITATION_MISMATCH', () => {
    expect(
      getDisplayCodeFromErrorCode('ACCREDITATION_MISMATCH', undefined)
    ).toBe('ACCREDITATION_INVALID')
  })

  test('returns STRUCTURE_INVALID for HEADER_REQUIRED', () => {
    expect(getDisplayCodeFromErrorCode('HEADER_REQUIRED', undefined)).toBe(
      'STRUCTURE_INVALID'
    )
  })

  test('returns TEMPLATE_INVALID for PROCESSING_TYPE_MISMATCH', () => {
    expect(
      getDisplayCodeFromErrorCode('PROCESSING_TYPE_MISMATCH', undefined)
    ).toBe('TEMPLATE_INVALID')
  })

  test('returns TEMPLATE_INVALID for SPREADSHEET_MALFORMED_MARKERS', () => {
    expect(
      getDisplayCodeFromErrorCode('SPREADSHEET_MALFORMED_MARKERS', undefined)
    ).toBe('TEMPLATE_INVALID')
  })

  test('returns errorCode for FILE_VIRUS_DETECTED', () => {
    expect(getDisplayCodeFromErrorCode('FILE_VIRUS_DETECTED', undefined)).toBe(
      'FILE_VIRUS_DETECTED'
    )
  })

  test('returns errorCode for ROW_ID_MISMATCH', () => {
    expect(getDisplayCodeFromErrorCode('ROW_ID_MISMATCH', undefined)).toBe(
      'ROW_ID_MISMATCH'
    )
  })

  test('returns undefined for undefined errorCode', () => {
    expect(getDisplayCodeFromErrorCode(undefined, 'NET_WEIGHT')).toBeUndefined()
  })
})
