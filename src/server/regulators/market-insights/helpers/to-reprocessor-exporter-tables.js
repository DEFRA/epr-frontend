import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatCurrency } from '#server/common/helpers/format-currency.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'

import { nameOf } from './reporting-period.js'

/** @import { ReportCount } from './to-waste-balance-table.js' */

/**
 * The measures both published tables print: what came in, where it was sent
 * on, and the PRN or PERN tonnage, revenue and average price.
 * @typedef {{
 *   tonnageReceived: number,
 *   tonnageSentOnTotal: number,
 *   tonnageSentOnToReprocessor: number,
 *   tonnageSentOnToExporter: number,
 *   tonnageSentOnToOtherFacilities: number,
 *   revisedTonnageIssued: number,
 *   totalRevenue: number,
 *   averagePricePerTonne: number
 * }} SharedFigures
 */

/**
 * @typedef {SharedFigures & {
 *   tonnageRecycled: number,
 *   tonnageReceivedButNotRecycled: number
 * }} ReprocessorFigures
 */

/**
 * @typedef {SharedFigures & {
 *   tonnageExported: number,
 *   tonnageReceivedButNotExported: number,
 *   tonnageStopped: number,
 *   tonnageRefused: number,
 *   tonnageRepatriated: number
 * }} ExporterFigures
 */

/**
 * The Grand Total the published tables end in: each accreditation type's
 * materials summed. It carries no average price, because the publication
 * does not calculate one for a grand total.
 * @typedef {{
 *   reprocessor: Omit<ReprocessorFigures, 'averagePricePerTonne'>,
 *   exporter: Omit<ExporterFigures, 'averagePricePerTonne'>
 * }} ReprocessorExporterTotals
 */

/**
 * One reporting month as the backend serves it: how many monthly reports the
 * month was owed and how many arrived, every material with the figures its
 * reprocessors and its exporters reported, and the totals across them.
 * @typedef {{
 *   reports: ReportCount,
 *   figures: Record<string, {
 *     reprocessor: ReprocessorFigures,
 *     exporter: ExporterFigures
 *   }>,
 *   totals: ReprocessorExporterTotals
 * }} ReprocessorExporterMonth
 */

/** @typedef {{ months: Record<string, ReprocessorExporterMonth> }} ReprocessorExporterData */

/** @typedef {{ material: string, figures: string[] }} FiguresRow */

/**
 * A table as the page lays it out: the column headings after the material,
 * one row per material with a formatted figure under each heading, and the
 * Grand Total row's figures under the same headings.
 * @typedef {{ columns: string[], rows: FiguresRow[], total: string[] }} FiguresTable
 */

/**
 * @typedef {{
 *   name: string,
 *   reports: string,
 *   reprocessor: FiguresTable,
 *   exporter: FiguresTable
 * }} FiguresMonth
 */

/** @typedef {{ months: FiguresMonth[] }} ReprocessorExporterTables */

/** @typedef {(key: string, values?: Record<string, string | number>) => string} Localise */

/**
 * The PRN and PERN columns. The published tab gives these a table of their
 * own per month; here each one is the tail of its accreditation type's table,
 * so a month reads as two tables rather than four.
 * @type {[keyof SharedFigures, (value: number) => string][]}
 */
const NOTE_COLUMNS = [
  ['revisedTonnageIssued', formatTonnage],
  ['totalRevenue', formatCurrency],
  ['averagePricePerTonne', formatCurrency]
]

/** @type {[keyof SharedFigures, (value: number) => string][]} */
const SENT_ON_COLUMNS = [
  ['tonnageSentOnTotal', formatTonnage],
  ['tonnageSentOnToReprocessor', formatTonnage],
  ['tonnageSentOnToExporter', formatTonnage],
  ['tonnageSentOnToOtherFacilities', formatTonnage]
]

/** @type {[keyof ReprocessorFigures, (value: number) => string][]} */
const REPROCESSOR_COLUMNS = [
  ['tonnageReceived', formatTonnage],
  ['tonnageRecycled', formatTonnage],
  ['tonnageReceivedButNotRecycled', formatTonnage],
  ...SENT_ON_COLUMNS,
  ...NOTE_COLUMNS
]

/** @type {[keyof ExporterFigures, (value: number) => string][]} */
const EXPORTER_COLUMNS = [
  ['tonnageReceived', formatTonnage],
  ['tonnageExported', formatTonnage],
  ['tonnageReceivedButNotExported', formatTonnage],
  ...SENT_ON_COLUMNS,
  ['tonnageStopped', formatTonnage],
  ['tonnageRefused', formatTonnage],
  ['tonnageRepatriated', formatTonnage],
  ...NOTE_COLUMNS
]

/**
 * A total the served totals carry is formatted like the column it sits under;
 * one they do not carry, the average price, shows the dash the publication
 * prints there.
 * @template {string} Measure
 * @param {Record<string, Record<Measure, number>>} byMaterial
 * @param {Partial<Record<Measure, number>>} totals
 * @param {[Measure, (value: number) => string][]} columns
 * @param {'reprocessor' | 'exporter'} accreditationType
 * @param {Localise} localise
 * @returns {FiguresTable}
 */
const toTable = (byMaterial, totals, columns, accreditationType, localise) => ({
  columns: columns.map(([measure]) =>
    localise(
      `regulators:marketInsights:figures:columns:${accreditationType}:${measure}`
    )
  ),
  rows: Object.entries(byMaterial)
    .map(([material, figures]) => ({
      material: getMaterialDisplayName(material),
      figures: columns.map(([measure, format]) => format(figures[measure]))
    }))
    .sort((one, other) => one.material.localeCompare(other.material)),
  total: columns.map(([measure, format]) => {
    const total = totals[measure]

    return total === undefined
      ? localise('regulators:marketInsights:figures:total:noAverage')
      : format(total)
  })
})

/**
 * Lays the served figures out the way the published UK tab is: for each
 * month, a reprocessor table and an exporter table, one row per material, the
 * tonnage columns in the tab's order, the served totals as the last row, and
 * above them how many of the reports the month expected the figures include.
 * Every figure is the one the service served; nothing is summed here.
 *
 * The months are the page's period, so a served month outside it is not
 * shown.
 * @param {ReprocessorExporterData} data
 * @param {string[]} months
 * @param {Localise} localise
 * @returns {ReprocessorExporterTables}
 */
export const toReprocessorExporterTables = (
  { months: served },
  months,
  localise
) => ({
  months: months.map((month) => {
    const {
      reports: { expected, submitted },
      figures,
      totals
    } = served[month]
    const byMaterial = Object.entries(figures)

    return {
      name: localise('regulators:marketInsights:period:month', {
        month: nameOf(month),
        year: Number(month.slice(0, 4))
      }),
      reports: localise('regulators:marketInsights:reports:count', {
        submitted,
        expected
      }),
      reprocessor: toTable(
        Object.fromEntries(
          byMaterial.map(([material, { reprocessor }]) => [
            material,
            reprocessor
          ])
        ),
        totals.reprocessor,
        REPROCESSOR_COLUMNS,
        'reprocessor',
        localise
      ),
      exporter: toTable(
        Object.fromEntries(
          byMaterial.map(([material, { exporter }]) => [material, exporter])
        ),
        totals.exporter,
        EXPORTER_COLUMNS,
        'exporter',
        localise
      )
    }
  })
})
