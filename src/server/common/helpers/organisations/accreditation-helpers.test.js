import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { describe, expect, it } from 'vitest'
import { isAccreditationActive } from './accreditation-helpers.js'

/** @import { AccreditationStatus } from '#domain/organisations/model.js' */

describe(isAccreditationActive, () => {
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
        accreditationNumber: toAccreditationNumber('ACC-001'),
        prns: { open: true },
        status: {
          current: /** @type {AccreditationStatus} */ (current),
          timeline: []
        }
      }

      expect(isAccreditationActive(accreditation)).toBe(expected)
    }
  )

  it('returns false for a year with no accreditation', () => {
    expect(isAccreditationActive(undefined)).toBe(false)
  })
})
