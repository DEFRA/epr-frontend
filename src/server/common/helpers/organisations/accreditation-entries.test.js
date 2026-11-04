import { describe, expect, it } from 'vitest'

import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { buildAccreditationView } from '#server/common/test-helpers/organisation-view-fixtures.js'

import { accreditationEntries, yearEntries } from './accreditation-entries.js'

/**
 * @param {string} accreditationNumber
 */
const accreditationNumbered = (accreditationNumber) =>
  buildAccreditationView({
    accreditationNumber: toAccreditationNumber(accreditationNumber)
  })

describe(yearEntries, () => {
  it('pairs each value with the year it is keyed by, as a number', () => {
    expect(yearEntries({ 2025: 'first', 2026: 'second' })).toStrictEqual([
      [2025, 'first'],
      [2026, 'second']
    ])
  })
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
