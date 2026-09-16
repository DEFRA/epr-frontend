import { describe, expect, it } from 'vitest'

import { toWasteBalanceTable } from './to-waste-balance-table.js'

/**
 * @import { PublishedFigures, PublishedMonth, WasteBalanceData } from './to-waste-balance-table.js'
 */

/**
 * Renders a key and whatever values it was given, so a test can see both.
 * @param {string} key
 * @param {Record<string, string | number>} [values]
 */
const asKey = (key, values = {}) =>
  [
    'translated',
    key,
    ...Object.entries(values).map(([name, value]) => `${name}=${value}`)
  ].join(':')

const reprocessor =
  'translated:regulators:marketInsights:wasteBalance:accreditationTypes:reprocessor'
const exporter =
  'translated:regulators:marketInsights:wasteBalance:accreditationTypes:exporter'

const januaryAndFebruary = ['2026-01', '2026-02']

/**
 * @param {number} netCredit
 * @returns {PublishedFigures}
 */
const figuresOf = (netCredit) => ({
  totalCredited: netCredit,
  eligibleForWasteBalance: netCredit,
  sentOnDeductions: 0,
  netCredit
})

/**
 * @param {PublishedMonth['figures']} figures
 * @param {PublishedMonth['reports']} [reports]
 * @returns {PublishedMonth}
 */
const monthOf = (figures, reports = { expected: 0, submitted: 0 }) => ({
  reports,
  figures
})

/**
 * @param {Record<string, PublishedMonth>} months
 * @param {WasteBalanceData['period']} [period]
 * @returns {WasteBalanceData}
 */
const dataOf = (
  months,
  period = { reports: { expected: 0, submitted: 0 } }
) => ({ months, period })

describe(toWasteBalanceTable, () => {
  it('names the months it was given, in calendar order', () => {
    expect(
      toWasteBalanceTable(
        dataOf({
          '2026-01': monthOf({ plastic: { reprocessor: figuresOf(1) } }),
          '2026-02': monthOf({ plastic: { reprocessor: figuresOf(2) } })
        }),
        januaryAndFebruary,
        asKey
      ).months
    ).toStrictEqual(['January', 'February'])
  })

  it('gives a material and accreditation type one row, with its net credit under each month and the total across them', () => {
    expect(
      toWasteBalanceTable(
        dataOf({
          '2026-01': monthOf({ plastic: { reprocessor: figuresOf(90) } }),
          '2026-02': monthOf({ plastic: { reprocessor: figuresOf(42.5) } })
        }),
        januaryAndFebruary,
        asKey
      ).rows
    ).toStrictEqual([
      {
        material: 'Plastic',
        accreditationType: reprocessor,
        netCredits: ['90.00', '42.50'],
        total: '132.50'
      }
    ])
  })

  it('shows only the months it was given, so a served month outside them is neither a column nor counted', () => {
    expect(
      toWasteBalanceTable(
        dataOf({
          '2026-01': monthOf({ plastic: { reprocessor: figuresOf(90) } }),
          '2026-02': monthOf({ plastic: { reprocessor: figuresOf(1000) } })
        }),
        ['2026-01'],
        asKey
      )
    ).toStrictEqual({
      months: ['January'],
      rows: [
        {
          material: 'Plastic',
          accreditationType: reprocessor,
          netCredits: ['90.00'],
          total: '90.00'
        }
      ],
      reports: {
        byMonth: [
          'translated:regulators:marketInsights:wasteBalance:reports:count:submitted=0:expected=0'
        ],
        period:
          'translated:regulators:marketInsights:wasteBalance:reports:count:submitted=0:expected=0'
      }
    })
  })

  it('names a material the way the rest of the service does', () => {
    expect(
      toWasteBalanceTable(
        dataOf({
          '2026-01': monthOf({ glass_re_melt: { reprocessor: figuresOf(1) } })
        }),
        ['2026-01'],
        asKey
      ).rows.map(({ material }) => material)
    ).toStrictEqual(['Glass remelt'])
  })

  it('orders the rows by material, then exporter before reprocessor, the way the publication is laid out', () => {
    expect(
      toWasteBalanceTable(
        dataOf({
          '2026-01': monthOf({
            plastic: { reprocessor: figuresOf(1), exporter: figuresOf(2) },
            aluminium: { reprocessor: figuresOf(3), exporter: figuresOf(4) }
          })
        }),
        ['2026-01'],
        asKey
      ).rows.map(({ material, accreditationType, total }) => [
        material,
        accreditationType,
        total
      ])
    ).toStrictEqual([
      ['Aluminium', exporter, '4.00'],
      ['Aluminium', reprocessor, '3.00'],
      ['Plastic', exporter, '2.00'],
      ['Plastic', reprocessor, '1.00']
    ])
  })

  it('states how many of the reports each month expected the figures include, and the served pair for the period', () => {
    expect(
      toWasteBalanceTable(
        dataOf(
          {
            '2026-01': monthOf(
              { plastic: { reprocessor: figuresOf(1) } },
              { expected: 2, submitted: 1 }
            ),
            '2026-02': monthOf(
              { plastic: { reprocessor: figuresOf(1) } },
              { expected: 3, submitted: 0 }
            )
          },
          { reports: { expected: 9, submitted: 4 } }
        ),
        januaryAndFebruary,
        asKey
      ).reports
    ).toStrictEqual({
      byMonth: [
        'translated:regulators:marketInsights:wasteBalance:reports:count:submitted=1:expected=2',
        'translated:regulators:marketInsights:wasteBalance:reports:count:submitted=0:expected=3'
      ],
      period:
        'translated:regulators:marketInsights:wasteBalance:reports:count:submitted=4:expected=9'
    })
  })
})
