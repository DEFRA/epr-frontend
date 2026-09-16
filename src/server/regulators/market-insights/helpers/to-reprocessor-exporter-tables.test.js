import { describe, expect, it } from 'vitest'

import { toReprocessorExporterTables } from './to-reprocessor-exporter-tables.js'

/**
 * @import { ExporterFigures, ReprocessorFigures, ReprocessorExporterData } from './to-reprocessor-exporter-tables.js'
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
 * @param {Partial<ReprocessorFigures>} figures
 * @returns {ReprocessorFigures}
 */
const reprocessorOf = (figures = {}) => ({
  tonnageReceived: 0,
  tonnageRecycled: 0,
  tonnageReceivedButNotRecycled: 0,
  tonnageSentOnTotal: 0,
  tonnageSentOnToReprocessor: 0,
  tonnageSentOnToExporter: 0,
  tonnageSentOnToOtherFacilities: 0,
  revisedTonnageIssued: 0,
  totalRevenue: 0,
  averagePricePerTonne: 0,
  ...figures
})

/**
 * @param {Partial<ExporterFigures>} figures
 * @returns {ExporterFigures}
 */
const exporterOf = (figures = {}) => ({
  tonnageReceived: 0,
  tonnageExported: 0,
  tonnageReceivedButNotExported: 0,
  tonnageSentOnTotal: 0,
  tonnageSentOnToReprocessor: 0,
  tonnageSentOnToExporter: 0,
  tonnageSentOnToOtherFacilities: 0,
  tonnageStopped: 0,
  tonnageRefused: 0,
  tonnageRepatriated: 0,
  revisedTonnageIssued: 0,
  totalRevenue: 0,
  averagePricePerTonne: 0,
  ...figures
})

/**
 * @param {Record<string, { reprocessor: ReprocessorFigures, exporter: ExporterFigures }>} figures
 */
const monthOf = (figures) => ({ figures })

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

  it('lays the reprocessor figures out in the published column order, with the PRN columns after the tonnage', () => {
    const { reprocessor } = toReprocessorExporterTables(
      dataOf({
        '2026-01': monthOf({
          plastic: {
            reprocessor: reprocessorOf({
              tonnageReceived: 1250.5,
              tonnageRecycled: 1100,
              tonnageReceivedButNotRecycled: 150.5,
              tonnageSentOnTotal: 50.25,
              tonnageSentOnToReprocessor: 40,
              tonnageSentOnToExporter: 0,
              tonnageSentOnToOtherFacilities: 10.25,
              revisedTonnageIssued: 900,
              totalRevenue: 108000,
              averagePricePerTonne: 120
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
          '150.50',
          '50.25',
          '40.00',
          '0.00',
          '10.25',
          '900.00',
          '£108,000.00',
          '£120.00'
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
              tonnageReceivedButNotExported: 20,
              tonnageSentOnTotal: 7,
              tonnageSentOnToReprocessor: 1,
              tonnageSentOnToExporter: 2,
              tonnageSentOnToOtherFacilities: 4,
              tonnageStopped: 0.5,
              tonnageRefused: 0.25,
              tonnageRepatriated: 0.125,
              revisedTonnageIssued: 250,
              totalRevenue: 12345.678,
              averagePricePerTonne: 49.38
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
          '20.00',
          '7.00',
          '1.00',
          '2.00',
          '4.00',
          '0.50',
          '0.25',
          '0.13',
          '250.00',
          '£12,345.68',
          '£49.38'
        ]
      }
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
