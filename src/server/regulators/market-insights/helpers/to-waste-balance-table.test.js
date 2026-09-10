import { describe, expect, it } from 'vitest'

import { toWasteBalanceTable } from './to-waste-balance-table.js'

/** @import { WasteBalanceFigure } from './to-waste-balance-table.js' */

/** @param {string} key */
const asKey = (key) => `translated:${key}`

const reprocessor =
  'translated:regulators:marketInsights:accreditationTypes:reprocessor'
const exporter =
  'translated:regulators:marketInsights:accreditationTypes:exporter'

const januaryAndFebruary = ['2026-01', '2026-02']

/** @type {WasteBalanceFigure} */
const glassReprocessedInJanuary = {
  material: 'Glass Re-melt',
  accreditationType: 'reprocessor',
  month: '2026-01',
  totalCredited: 120,
  eligibleForWasteBalance: 100,
  sentOnDeductions: 10,
  netCredit: 90
}

/** @type {WasteBalanceFigure} */
const glassReprocessedInFebruary = {
  ...glassReprocessedInJanuary,
  month: '2026-02',
  netCredit: 42.5
}

/** @type {WasteBalanceFigure} */
const aluminiumExportedInFebruary = {
  material: 'Aluminium',
  accreditationType: 'exporter',
  month: '2026-02',
  totalCredited: 8,
  eligibleForWasteBalance: 8,
  sentOnDeductions: 0,
  netCredit: 8
}

describe(toWasteBalanceTable, () => {
  it('names the months it was given, in calendar order', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInFebruary, glassReprocessedInJanuary],
        januaryAndFebruary,
        asKey
      ).months
    ).toStrictEqual(['January', 'February'])
  })

  it('gives a month nothing was credited in a column of its own', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInJanuary],
        ['2026-01', '2026-02', '2026-03'],
        asKey
      )
    ).toStrictEqual({
      months: ['January', 'February', 'March'],
      rows: [
        {
          material: 'Glass Re-melt',
          accreditationType: reprocessor,
          netCredits: ['90.00', '0.00', '0.00'],
          total: '90.00'
        }
      ]
    })
  })

  it('gives a material and accreditation type one row, with its net credit under each month', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInJanuary, glassReprocessedInFebruary],
        januaryAndFebruary,
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Glass Re-melt',
        accreditationType: reprocessor,
        netCredits: ['90.00', '42.50'],
        total: '132.50'
      }
    ])
  })

  it('separates the accreditation types of one material', () => {
    /** @type {WasteBalanceFigure} */
    const glassExportedInJanuary = {
      ...glassReprocessedInJanuary,
      accreditationType: 'exporter',
      netCredit: 5
    }

    expect(
      toWasteBalanceTable(
        [glassReprocessedInJanuary, glassExportedInJanuary],
        ['2026-01'],
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Glass Re-melt',
        accreditationType: exporter,
        netCredits: ['5.00'],
        total: '5.00'
      },
      {
        material: 'Glass Re-melt',
        accreditationType: reprocessor,
        netCredits: ['90.00'],
        total: '90.00'
      }
    ])
  })

  it('orders the rows by material, so the page reads the way the publication is laid out', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInFebruary, aluminiumExportedInFebruary],
        januaryAndFebruary,
        asKey
      ).rows.map(({ material }) => material)
    ).toStrictEqual(['Aluminium', 'Glass Re-melt'])
  })

  // The published tab prints a zero in every month a row reported nothing, to
  // hold the approved layout, so a blank here would be a difference a reader
  // holding the two side by side has to explain away.
  it('reads a month the material reported nothing in as zero', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInJanuary, aluminiumExportedInFebruary],
        januaryAndFebruary,
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Aluminium',
        accreditationType: exporter,
        netCredits: ['0.00', '8.00'],
        total: '8.00'
      },
      {
        material: 'Glass Re-melt',
        accreditationType: reprocessor,
        netCredits: ['90.00', '0.00'],
        total: '90.00'
      }
    ])
  })

  // The backend serves the month still running, and the total has to match the
  // cells beside it, so a figure outside the period leaves neither behind.
  it('leaves out a figure credited outside the reporting period', () => {
    /** @type {WasteBalanceFigure} */
    const glassReprocessedInMarch = {
      ...glassReprocessedInJanuary,
      month: '2026-03',
      netCredit: 1000
    }

    expect(
      toWasteBalanceTable(
        [glassReprocessedInJanuary, glassReprocessedInMarch],
        januaryAndFebruary,
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Glass Re-melt',
        accreditationType: reprocessor,
        netCredits: ['90.00', '0.00'],
        total: '90.00'
      }
    ])
  })

  it('names a material the backend could not resolve, rather than heading the row with a blank', () => {
    expect(
      toWasteBalanceTable(
        [{ ...glassReprocessedInJanuary, material: '' }],
        ['2026-01'],
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'translated:regulators:marketInsights:unknownMaterial',
        accreditationType: reprocessor,
        netCredits: ['90.00'],
        total: '90.00'
      }
    ])
  })

  it('adds up two figures credited to the same material, type and month', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInJanuary, glassReprocessedInJanuary],
        ['2026-01'],
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Glass Re-melt',
        accreditationType: reprocessor,
        netCredits: ['180.00'],
        total: '180.00'
      }
    ])
  })

  it('has no rows when the period reported nothing', () => {
    expect(toWasteBalanceTable([], januaryAndFebruary, asKey)).toStrictEqual({
      months: ['January', 'February'],
      rows: []
    })
  })
})
