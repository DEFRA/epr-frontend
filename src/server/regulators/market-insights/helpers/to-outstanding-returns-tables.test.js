import { describe, expect, it } from 'vitest'

import { toOutstandingReturnsTables } from './to-outstanding-returns-tables.js'

/** @import { OutstandingReturnsData } from './to-outstanding-returns-tables.js' */

/** @param {Partial<Record<string, number>>} counts */
const bandsOf = (counts) => ({
  up_to_500: 0,
  up_to_5000: 0,
  up_to_10000: 0,
  over_10000: 0,
  ...counts
})

/**
 * @param {Partial<Record<string, Partial<Record<string, number>>>>} materials
 */
const monthOf = (materials) => ({
  figures: {
    plastic: bandsOf(materials.plastic ?? {}),
    aluminium: bandsOf(materials.aluminium ?? {})
  }
})

/** @type {OutstandingReturnsData} */
const januaryToMarch = {
  months: {
    '2026-01': monthOf({ plastic: { over_10000: 2 } }),
    '2026-02': monthOf({ aluminium: { up_to_500: 1 } }),
    '2026-03': monthOf({ plastic: { up_to_5000: 3, over_10000: 1 } })
  }
}

/** @param {string} key */
const localise = (key) => key.split(':').at(-1) ?? key

describe('the outstanding returns tables', () => {
  it('names the months across, in the order the period runs', () => {
    const { months } = toOutstandingReturnsTables(
      januaryToMarch,
      ['2026-01', '2026-02', '2026-03'],
      localise
    )

    expect(months).toStrictEqual(['January', 'February', 'March'])
  })

  it('gives each material a table of its own, in the order a regulator reads them', () => {
    const { materials } = toOutstandingReturnsTables(
      januaryToMarch,
      ['2026-01', '2026-02'],
      localise
    )

    expect(materials.map(({ material }) => material)).toStrictEqual([
      'Aluminium',
      'Plastic'
    ])
  })

  it('puts the tonnage bands down the side, smallest first, and the count for each month across', () => {
    const [, plastic] = toOutstandingReturnsTables(
      januaryToMarch,
      ['2026-01', '2026-02', '2026-03'],
      localise
    ).materials

    expect(plastic.rows).toStrictEqual([
      { band: 'up_to_500', counts: ['0', '0', '0'] },
      { band: 'up_to_5000', counts: ['0', '0', '3'] },
      { band: 'up_to_10000', counts: ['0', '0', '0'] },
      { band: 'over_10000', counts: ['2', '0', '1'] }
    ])
  })

  it('shows only the months of the period, so a month served outside it is left off', () => {
    const { months, materials } = toOutstandingReturnsTables(
      januaryToMarch,
      ['2026-01', '2026-02'],
      localise
    )

    expect(months).toStrictEqual(['January', 'February'])
    expect(materials[1].rows.at(-1)?.counts).toStrictEqual(['2', '0'])
  })
})
