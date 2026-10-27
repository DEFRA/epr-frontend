import { describe, expect, it } from 'vitest'

import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'

import { accreditationEntries } from './accreditation-entries.js'

/**
 * @param {string} accreditationNumber
 */
const accreditationNumbered = (accreditationNumber) =>
  /** @type {const} */ ({
    accreditationNumber: toAccreditationNumber(accreditationNumber),
    status: { current: 'approved', timeline: [] }
  })

describe(accreditationEntries, () => {
  it('pairs each accreditation with the year it is keyed by, as a number', () => {
    const accreditation2025 = accreditationNumbered('A25ER5001180114PL')
    const accreditation2026 = accreditationNumbered('A26ER5001180114PL')

    expect(
      accreditationEntries({ 2026: accreditation2026, 2025: accreditation2025 })
    ).toStrictEqual([
      [2025, accreditation2025],
      [2026, accreditation2026]
    ])
  })
})
