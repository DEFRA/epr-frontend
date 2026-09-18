import {
  exporterOf,
  reprocessorOf,
  totalsOf
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { describe, expect, it } from 'vitest'

import { toReprocessorExporterTables } from './to-reprocessor-exporter-tables.js'

/**
 * @import { ExporterFigures, ReprocessorFigures, ReprocessorExporterData, ReprocessorExporterTotals } from './to-reprocessor-exporter-tables.js'
 */

/**
 * @param {string} key
 * @param {Record<string, string | number>} [values]
 */
const asKey = (key, values = {}) =>
  [
    'translated',
    key,
    ...Object.entries(values).map(([name, value]) => `${name}=${value}`)
  ].join(':')

/**
 * @param {Record<string, { reprocessor: ReprocessorFigures, exporter: ExporterFigures }>} figures
 * @param {ReprocessorExporterData['months'][string]['reports']} [reports]
 * @param {ReprocessorExporterTotals} [totals]
 */
const monthOf = (
  figures,
  reports = { expected: 0, submitted: 0 },
  totals = totalsOf()
) => ({
  reports,
  figures,
  totals
})

/**
 * @param {ReprocessorExporterData['months']} months
 * @returns {ReprocessorExporterData}
 */
const dataOf = (months) => ({ months })

const onlyPlastic = {
  plastic: { reprocessor: reprocessorOf(), exporter: exporterOf() }
}

describe(toReprocessorExporterTables, () => {
  it('names each month it was given with its year, in calendar order', () => {
    expect(
      toReprocessorExporterTables(
        dataOf({
          '2026-01': monthOf(onlyPlastic),
          '2026-02': monthOf(onlyPlastic)
        }),
        ['2026-01', '2026-02'],
        asKey
      ).months.map(({ name }) => name)
    ).toStrictEqual([
      'translated:regulators:marketInsights:period:month:month=January:year=2026',
      'translated:regulators:marketInsights:period:month:month=February:year=2026'
    ])
  })

  it('states how many of the reports each month expected the figures include', () => {
    expect(
      toReprocessorExporterTables(
        dataOf({
          '2026-01': monthOf(onlyPlastic, { expected: 2, submitted: 1 }),
          '2026-02': monthOf(onlyPlastic, { expected: 3, submitted: 0 })
        }),
        ['2026-01', '2026-02'],
        asKey
      ).months.map(({ reports }) => reports)
    ).toStrictEqual([
      'translated:regulators:marketInsights:reports:count:submitted=1:expected=2',
      'translated:regulators:marketInsights:reports:count:submitted=0:expected=3'
    ])
  })

  it('shows only the months it was given, so a served month outside them is not a table', () => {
    expect(
      toReprocessorExporterTables(
        dataOf({
          '2026-01': monthOf(onlyPlastic),
          '2026-02': monthOf(onlyPlastic)
        }),
        ['2026-01'],
        asKey
      ).months
    ).toHaveLength(1)
  })

  // In this test and the next, the served totals and averages deliberately do
  // not reconcile with the figures they would be derived from, so a helper
  // that recomputed any of them would fail rather than pass by coincidence.
  it('lays the reprocessor figures out in the published column order, with the PRN columns after the tonnage', () => {
    const { reprocessor } = toReprocessorExporterTables(
      dataOf({
        '2026-01': monthOf({
          plastic: {
            reprocessor: reprocessorOf({
              tonnageReceived: 1250.5,
              tonnageRecycled: 1100,
              tonnageReceivedButNotRecycled: 151,
              tonnageSentOnTotal: 51,
              tonnageSentOnToReprocessor: 40,
              tonnageSentOnToExporter: 0,
              tonnageSentOnToOtherFacilities: 10.25,
              revisedTonnageIssued: 900,
              totalRevenue: 108000,
              averagePricePerTonne: 121
            }),
            exporter: exporterOf()
          }
        })
      }),
      ['2026-01'],
      asKey
    ).months[0]

    expect(reprocessor.columns).toStrictEqual(
      [
        'tonnageReceived',
        'tonnageRecycled',
        'tonnageReceivedButNotRecycled',
        'tonnageSentOnTotal',
        'tonnageSentOnToReprocessor',
        'tonnageSentOnToExporter',
        'tonnageSentOnToOtherFacilities',
        'revisedTonnageIssued',
        'totalRevenue',
        'averagePricePerTonne'
      ].map(
        (measure) =>
          `translated:regulators:marketInsights:figures:columns:reprocessor:${measure}`
      )
    )
    expect(reprocessor.rows).toStrictEqual([
      {
        material: 'Plastic',
        figures: [
          '1,250.50',
          '1,100.00',
          '151.00',
          '51.00',
          '40.00',
          '0.00',
          '10.25',
          '900.00',
          '£108,000.00',
          '£121.00'
        ]
      }
    ])
  })

  it('lays the exporter figures out in the published column order, with the PERN columns after the tonnage', () => {
    const { exporter } = toReprocessorExporterTables(
      dataOf({
        '2026-01': monthOf({
          plastic: {
            reprocessor: reprocessorOf(),
            exporter: exporterOf({
              tonnageReceived: 300,
              tonnageExported: 280,
              tonnageReceivedButNotExported: 21,
              tonnageSentOnTotal: 8,
              tonnageSentOnToReprocessor: 1,
              tonnageSentOnToExporter: 2,
              tonnageSentOnToOtherFacilities: 4,
              tonnageStopped: 0.5,
              tonnageRefused: 0.25,
              tonnageRepatriated: 0.125,
              revisedTonnageIssued: 250,
              totalRevenue: 12345.678,
              averagePricePerTonne: 50
            })
          }
        })
      }),
      ['2026-01'],
      asKey
    ).months[0]

    expect(exporter.columns).toStrictEqual(
      [
        'tonnageReceived',
        'tonnageExported',
        'tonnageReceivedButNotExported',
        'tonnageSentOnTotal',
        'tonnageSentOnToReprocessor',
        'tonnageSentOnToExporter',
        'tonnageSentOnToOtherFacilities',
        'tonnageStopped',
        'tonnageRefused',
        'tonnageRepatriated',
        'revisedTonnageIssued',
        'totalRevenue',
        'averagePricePerTonne'
      ].map(
        (measure) =>
          `translated:regulators:marketInsights:figures:columns:exporter:${measure}`
      )
    )
    expect(exporter.rows).toStrictEqual([
      {
        material: 'Plastic',
        figures: [
          '300.00',
          '280.00',
          '21.00',
          '8.00',
          '1.00',
          '2.00',
          '4.00',
          '0.50',
          '0.25',
          '0.13',
          '250.00',
          '£12,345.68',
          '£50.00'
        ]
      }
    ])
  })

  it('ends each table in the served totals, with a dash for the average price the publication does not calculate for a grand total', () => {
    const { reprocessor, exporter } = toReprocessorExporterTables(
      dataOf({
        '2026-01': monthOf(
          {
            plastic: {
              reprocessor: reprocessorOf({ tonnageReceived: 1250.5 }),
              exporter: exporterOf({ tonnageReceived: 300 })
            }
          },
          { expected: 0, submitted: 0 },
          totalsOf({
            reprocessor: {
              tonnageReceived: 999,
              tonnageRecycled: 900,
              tonnageReceivedButNotRecycled: 99,
              tonnageSentOnTotal: 30,
              tonnageSentOnToReprocessor: 10,
              tonnageSentOnToExporter: 10,
              tonnageSentOnToOtherFacilities: 10,
              revisedTonnageIssued: 800,
              totalRevenue: 96000
            },
            exporter: {
              tonnageReceived: 555,
              tonnageExported: 500,
              tonnageReceivedButNotExported: 55,
              tonnageSentOnTotal: 6,
              tonnageSentOnToReprocessor: 1,
              tonnageSentOnToExporter: 2,
              tonnageSentOnToOtherFacilities: 3,
              tonnageStopped: 0.5,
              tonnageRefused: 0.25,
              tonnageRepatriated: 0.125,
              revisedTonnageIssued: 450,
              totalRevenue: 22500.5
            }
          })
        )
      }),
      ['2026-01'],
      asKey
    ).months[0]

    expect(reprocessor.total).toStrictEqual([
      '999.00',
      '900.00',
      '99.00',
      '30.00',
      '10.00',
      '10.00',
      '10.00',
      '800.00',
      '£96,000.00',
      'translated:regulators:marketInsights:figures:total:noAverage'
    ])
    expect(exporter.total).toStrictEqual([
      '555.00',
      '500.00',
      '55.00',
      '6.00',
      '1.00',
      '2.00',
      '3.00',
      '0.50',
      '0.25',
      '0.13',
      '450.00',
      '£22,500.50',
      'translated:regulators:marketInsights:figures:total:noAverage'
    ])
  })

  it('names the materials the way the rest of the service does and orders the rows by that name', () => {
    const { reprocessor, exporter } = toReprocessorExporterTables(
      dataOf({
        '2026-01': monthOf({
          plastic: { reprocessor: reprocessorOf(), exporter: exporterOf() },
          glass_re_melt: {
            reprocessor: reprocessorOf(),
            exporter: exporterOf()
          },
          fibre: { reprocessor: reprocessorOf(), exporter: exporterOf() },
          aluminium: { reprocessor: reprocessorOf(), exporter: exporterOf() }
        })
      }),
      ['2026-01'],
      asKey
    ).months[0]

    expect(reprocessor.rows.map(({ material }) => material)).toStrictEqual([
      'Aluminium',
      'Fibre-based composite',
      'Glass remelt',
      'Plastic'
    ])
    expect(exporter.rows.map(({ material }) => material)).toStrictEqual([
      'Aluminium',
      'Fibre-based composite',
      'Glass remelt',
      'Plastic'
    ])
  })
})
