import { describe, expect, it } from 'vitest'
import { isAccreditationViewActive } from './accreditation-helpers.js'

/** @import { AccreditationStatus } from '#domain/organisations/model.js' */

describe(isAccreditationViewActive, () => {
  it.each([
    { current: 'approved', expected: true },
    { current: 'suspended', expected: true },
    { current: 'created', expected: false },
    { current: 'rejected', expected: false },
    { current: 'cancelled', expected: false }
  ])(
    'returns $expected for $current accreditation',
    ({ current, expected }) => {
      const accreditation = {
        accreditationNumber: 'ACC-001',
        status: {
          current: /** @type {AccreditationStatus} */ (current),
          timeline: {}
        }
      }

      expect(isAccreditationViewActive(accreditation)).toBe(expected)
    }
  )

  it('returns false for a year with no accreditation', () => {
    expect(isAccreditationViewActive(undefined)).toBe(false)
  })
})
