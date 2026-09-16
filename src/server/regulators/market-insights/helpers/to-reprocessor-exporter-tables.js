import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatCurrency } from '#server/common/helpers/format-currency.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'

import { nameOf } from './reporting-period.js'

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
 * One reporting month as the backend serves it: every material, each with
 * the figures its reprocessors and its exporters reported.
 * @typedef {{
 *   figures: Record<string, {
 *     reprocessor: ReprocessorFigures,
 *     exporter: ExporterFigures
 *   }>
 * }} ReprocessorExporterMonth
 */

/** @typedef {{ months: Record<string, ReprocessorExporterMonth> }} ReprocessorExporterData */

/** @typedef {{ material: string, figures: string[] }} FiguresRow */

/**
 * A table as the page lays it out: the column headings after the material,
 * and one row per material with a formatted figure under each heading.
 * @typedef {{ columns: string[], rows: FiguresRow[] }} FiguresTable
 */

/**
 * @typedef {{
 *   name: string,
 *   reprocessor: FiguresTable,
 *   exporter: FiguresTable
 * }} FiguresMonth
 */

/** @typedef {{ months: FiguresMonth[] }} ReprocessorExporterTables */

/** @typedef {(key: string, values?: Record<string, string | number>) => string} Localise */

/**
 * The PRN and PERN columns, which both tables print last, after the tonnage
 * the published tab lays out.
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
 * @template {string} Measure
 * @param {Record<string, Record<Measure, number>>} byMaterial
 * @param {[Measure, (value: number) => string][]} columns
 * @param {'reprocessor' | 'exporter'} accreditationType
 * @param {Localise} localise
 * @returns {FiguresTable}
 */
const toTable = (byMaterial, columns, accreditationType, localise) => ({
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
    .sort((one, other) => one.material.localeCompare(other.material))
})

/**
 * Lays the served figures out the way the published UK tab is: for each
 * month, a reprocessor table and an exporter table, one row per material,
 * with the PRN or PERN tonnage, revenue and average price after the tonnage
 * columns. Every figure is the one the service served; nothing is summed
 * here.
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
    const byMaterial = Object.entries(served[month].figures)

    return {
      name: localise('regulators:marketInsights:period:month', {
        month: nameOf(month),
        year: Number(month.slice(0, 4))
      }),
      reprocessor: toTable(
        Object.fromEntries(
          byMaterial.map(([material, { reprocessor }]) => [
            material,
            reprocessor
          ])
        ),
        REPROCESSOR_COLUMNS,
        'reprocessor',
        localise
      ),
      exporter: toTable(
        Object.fromEntries(
          byMaterial.map(([material, { exporter }]) => [material, exporter])
        ),
        EXPORTER_COLUMNS,
        'exporter',
        localise
      )
    }
  })
})
