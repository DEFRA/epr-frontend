import { describe, expect, it } from 'vitest'

import { toWasteBalanceTable } from './to-waste-balance-table.js'

/** @param {string} key */
const asKey = (key) => `translated:${key}`

const glassReprocessedInJanuary = {
  material: 'Glass Re-melt',
  accreditationType: /** @type {const} */ ('reprocessor'),
  month: '2026-01',
  totalCredited: 120,
  eligibleForWasteBalance: 100,
  sentOnDeductions: 10,
  netCredit: 90
}

const glassReprocessedInFebruary = {
  ...glassReprocessedInJanuary,
  month: '2026-02',
  netCredit: 42.5
}

const aluminiumExportedInFebruary = {
  material: 'Aluminium',
  accreditationType: /** @type {const} */ ('exporter'),
  month: '2026-02',
  totalCredited: 8,
  eligibleForWasteBalance: 8,
  sentOnDeductions: 0,
  netCredit: 8
}

describe(toWasteBalanceTable, () => {
  it('lays the reported months out as columns, in calendar order', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInFebruary, glassReprocessedInJanuary],
        asKey
      ).months
    ).toStrictEqual(['January', 'February'])
  })

  it('gives a material and accreditation type one row, with its net credit under each month', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInJanuary, glassReprocessedInFebruary],
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Glass Re-melt',
        accreditationType:
          'translated:regulators:marketInsights:accreditationTypes:reprocessor',
        netCredits: ['90.00', '42.50'],
        total: '132.50'
      }
    ])
  })

  it('separates the accreditation types of one material', () => {
    const glassExportedInJanuary = {
      ...glassReprocessedInJanuary,
      accreditationType: /** @type {const} */ ('exporter'),
      netCredit: 5
    }

    expect(
      toWasteBalanceTable(
        [glassReprocessedInJanuary, glassExportedInJanuary],
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Glass Re-melt',
        accreditationType:
          'translated:regulators:marketInsights:accreditationTypes:exporter',
        netCredits: ['5.00'],
        total: '5.00'
      },
      {
        material: 'Glass Re-melt',
        accreditationType:
          'translated:regulators:marketInsights:accreditationTypes:reprocessor',
        netCredits: ['90.00'],
        total: '90.00'
      }
    ])
  })

  it('orders the rows by material, so the page reads the way the publication is laid out', () => {
    expect(
      toWasteBalanceTable(
        [glassReprocessedInFebruary, aluminiumExportedInFebruary],
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
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Aluminium',
        accreditationType:
          'translated:regulators:marketInsights:accreditationTypes:exporter',
        netCredits: ['0.00', '8.00'],
        total: '8.00'
      },
      {
        material: 'Glass Re-melt',
        accreditationType:
          'translated:regulators:marketInsights:accreditationTypes:reprocessor',
        netCredits: ['90.00', '0.00'],
        total: '90.00'
      }
    ])
  })

  it('has no months and no rows when the year reported nothing', () => {
    expect(toWasteBalanceTable([], asKey)).toStrictEqual({
      months: [],
      rows: []
    })
  })
})
