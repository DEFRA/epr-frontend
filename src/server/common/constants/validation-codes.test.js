import { describe, expect, test } from 'vitest'

import { getDisplayCodeFromErrorCode } from './validation-codes.js'

describe('#getDisplayCodeFromErrorCode', () => {
  test('returns CALCULATED_FIELD_MISMATCH for NET_WEIGHT_CALCULATION_MISMATCH with any header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'NET_WEIGHT_CALCULATION_MISMATCH',
        'NET_WEIGHT'
      )
    ).toBe('CALCULATED_FIELD_MISMATCH')
  })

  test('returns CALCULATED_FIELD_MISMATCH for NET_WEIGHT_CALCULATION_MISMATCH without header', () => {
    expect(
      getDisplayCodeFromErrorCode('NET_WEIGHT_CALCULATION_MISMATCH', undefined)
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

  test('returns null for numeric error code with non-weight header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_A_NUMBER',
        'TONNAGE_RECEIVED_FOR_RECYCLING'
      )
    ).toBeNull()
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

  test('returns null for MUST_BE_A_VALID_DATE with non-date header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_A_VALID_DATE', 'NET_WEIGHT')
    ).toBeNull()
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

  test('returns null for MUST_BE_YES_OR_NO with non-yes-no header', () => {
    expect(
      getDisplayCodeFromErrorCode('MUST_BE_YES_OR_NO', 'GROSS_WEIGHT')
    ).toBeNull()
  })

  test('returns DROPDOWN_FORMAT_INVALID for MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD with dropdown header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD',
        'HOW_DID_YOU_CALCULATE_RECYCLABLE_PROPORTION'
      )
    ).toBe('DROPDOWN_FORMAT_INVALID')
  })

  test('returns null for MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD with non-dropdown header', () => {
    expect(
      getDisplayCodeFromErrorCode(
        'MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD',
        'GROSS_WEIGHT'
      )
    ).toBeNull()
  })

  test('returns null for undefined errorCode', () => {
    expect(getDisplayCodeFromErrorCode(undefined, 'NET_WEIGHT')).toBeNull()
  })
})
