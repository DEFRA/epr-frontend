import { describe, expect, it } from 'vitest'

import { toWasteBalanceTable } from './to-waste-balance-table.js'

/**
 * @import { PublishedFigures, PublishedMonth, WasteBalanceData } from './to-waste-balance-table.js'
 * @import { OperatorCounts } from './few-operators.js'
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
 * @param {Partial<OperatorCounts>} [counts]
 * @returns {PublishedFigures}
 */
const figuresOf = (netCredit, counts = {}) => ({
  totalCredited: netCredit,
  eligibleForWasteBalance: netCredit,
  sentOnDeductions: 0,
  netCredit,
  operatorCount: 0,
  submittingOperatorCount: 0,
  ...counts
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
 * The backend serves a row total's operator counts for every row its months
 * serve, so each is at zero unless a test names it.
 * @param {Record<string, PublishedMonth>} months
 * @param {Partial<WasteBalanceData['period']>} [period]
 * @returns {WasteBalanceData}
 */
const dataOf = (months, { reports, operatorCounts = {} } = {}) => {
  /** @type {WasteBalanceData['period']['operatorCounts']} */
  const counts = {}
  for (const { figures } of Object.values(months)) {
    for (const [material, byType] of Object.entries(figures)) {
      for (const accreditationType of Object.keys(byType)) {
        counts[material] = {
          ...counts[material],
          [accreditationType]: operatorCounts[material]?.[
            accreditationType
          ] ?? { operatorCount: 0, submittingOperatorCount: 0 }
        }
      }
    }
  }
  return {
    months,
    period: {
      reports: reports ?? { expected: 0, submitted: 0 },
      operatorCounts: counts
    }
  }
}

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
        fewOperators: [undefined, undefined],
        total: '132.50',
        totalFewOperators: undefined
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
          fewOperators: [undefined],
          total: '90.00',
          totalFewOperators: undefined
        }
      ],
      reports: {
        byMonth: [
          'translated:regulators:marketInsights:reports:count:submitted=0:expected=0'
        ],
        period:
          'translated:regulators:marketInsights:reports:count:submitted=0:expected=0'
      }
    })
  })

  it('states the operator counts under each month few operators contributed to, and under no other', () => {
    expect(
      toWasteBalanceTable(
        dataOf({
          '2026-01': monthOf({
            plastic: {
              reprocessor: figuresOf(90, {
                operatorCount: 4,
                submittingOperatorCount: 2
              })
            }
          }),
          '2026-02': monthOf({
            plastic: {
              reprocessor: figuresOf(42.5, {
                operatorCount: 4,
                submittingOperatorCount: 3
              })
            }
          })
        }),
        januaryAndFebruary,
        asKey
      ).rows[0].fewOperators
    ).toStrictEqual([
      'translated:regulators:marketInsights:fewOperators:counts:operators=4:submitting=2',
      undefined
    ])
  })

  it('states the operator counts the period served for a row total few operators contributed to, and not for another', () => {
    const period = {
      reports: { expected: 0, submitted: 0 },
      operatorCounts: {
        plastic: {
          reprocessor: { operatorCount: 5, submittingOperatorCount: 2 },
          exporter: { operatorCount: 5, submittingOperatorCount: 4 }
        }
      }
    }

    expect(
      toWasteBalanceTable(
        dataOf(
          {
            '2026-01': monthOf({
              plastic: { reprocessor: figuresOf(1), exporter: figuresOf(2) }
            })
          },
          period
        ),
        ['2026-01'],
        asKey
      ).rows.map(({ accreditationType, totalFewOperators }) => [
        accreditationType,
        totalFewOperators
      ])
    ).toStrictEqual([
      [exporter, undefined],
      [
        reprocessor,
        'translated:regulators:marketInsights:fewOperators:counts:operators=5:submitting=2'
      ]
    ])
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
        'translated:regulators:marketInsights:reports:count:submitted=1:expected=2',
        'translated:regulators:marketInsights:reports:count:submitted=0:expected=3'
      ],
      period:
        'translated:regulators:marketInsights:reports:count:submitted=4:expected=9'
    })
  })
})
