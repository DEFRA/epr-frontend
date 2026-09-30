import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'

import {
  fromFewOperators,
  leavesOutConfidential,
  markedFigureOf,
  sumOf
} from './few-operators.js'
import { nameOf } from './reporting-period.js'

/** @import { OperatorCounts } from './few-operators.js' */

/**
 * How many monthly reports were expected and how many the figures include.
 * @typedef {{ expected: number, submitted: number }} ReportCount
 */

/**
 * The net credit for a material and accreditation type in a reporting month,
 * alongside the measures it was derived from.
 * @typedef {{
 *   totalCredited: number,
 *   eligibleForWasteBalance: number,
 *   sentOnDeductions: number,
 *   netCredit: number
 * } & OperatorCounts} PublishedFigures
 */

/**
 * One reporting month as the backend serves it: the figures keyed by material
 * then accreditation type, and the reports the month was owed.
 * @typedef {{
 *   reports: ReportCount,
 *   figures: Record<string, Record<string, PublishedFigures>>
 * }} PublishedMonth
 */

/**
 * The period as the backend serves it: the reports it was owed, the operator
 * counts behind each row's total across its months, and the net credit each
 * row totals across them, already summed and rounded by the backend.
 * @typedef {{
 *   months: Record<string, PublishedMonth>,
 *   period: {
 *     reports: ReportCount,
 *     operatorCounts: Record<string, Record<string, OperatorCounts>>,
 *     figures: Record<string, Record<string, { netCredit: number }>>
 *   }
 * }} WasteBalanceData
 */

/**
 * A row's figures, each marked confidential where few operators were
 * accredited for it. Where the published workbook shows the total without its
 * confidential months, the published total sums the rest; otherwise it is
 * empty.
 * @typedef {{
 *   material: string,
 *   accreditationType: string,
 *   netCredits: string[],
 *   total: string,
 *   published: string
 * }} WasteBalanceRow
 */

/**
 * The table has a published total column when any row's total leaves out
 * confidential months.
 * @typedef {{
 *   months: string[],
 *   rows: WasteBalanceRow[],
 *   reports: { byMonth: string[], period: string },
 *   marked: boolean,
 *   publishedColumn: boolean
 * }} WasteBalanceTable
 */

/**
 * A row's figures, before its own marked and published states are stripped
 * for display.
 * @typedef {WasteBalanceRow & { marked: boolean, publishes: boolean }} MarkedWasteBalanceRow
 */

/**
 * A row with each month's net credit and its total across the months marked
 * or noted.
 * @param {{
 *   material: string,
 *   accreditationType: string,
 *   periodCounts: OperatorCounts,
 *   totalNetCredit: number,
 *   figures: PublishedFigures[]
 * }} row
 * @returns {MarkedWasteBalanceRow}
 */
const markedRowOf = ({ figures, periodCounts, totalNetCredit, ...row }) => {
  const unmarked = figures.filter(
    (figure) => !fromFewOperators(figure, figure.netCredit !== 0)
  )
  const monthMarked = unmarked.length < figures.length
  const totalMarked = fromFewOperators(periodCounts, totalNetCredit !== 0)
  const total = markedFigureOf(
    formatTonnage(totalNetCredit),
    periodCounts,
    totalNetCredit !== 0
  )
  const publishes = leavesOutConfidential(monthMarked, totalMarked)

  return {
    ...row,
    netCredits: figures.map((figure) =>
      markedFigureOf(
        formatTonnage(figure.netCredit),
        figure,
        figure.netCredit !== 0
      )
    ),
    total,
    published: publishes
      ? formatTonnage(sumOf(unmarked.map(({ netCredit }) => netCredit)))
      : '',
    marked: monthMarked || totalMarked,
    publishes
  }
}

/**
 * Lays the served figures out the way the published Waste Balance tab is: one
 * row per material and accreditation type, the reporting months across as
 * columns, and the net credit in the cells, with a row beneath saying how many
 * of the reports each month expected the figures include.
 *
 * The pivot is presentation. Every figure, including a row's total across its
 * months and the period's report count, is the one the service served,
 * except a published total, which sums the months the workbook publishes.
 *
 * The months are the page's period, so the columns run over the span the
 * caption states, and a served month outside it is not shown.
 * @param {WasteBalanceData} data
 * @param {string[]} months
 * @param {(key: string, values?: Record<string, string | number>) => string} localise
 * @returns {WasteBalanceTable}
 */
export const toWasteBalanceTable = (
  { months: served, period },
  months,
  localise
) => {
  /** @type {Map<string, { material: string, accreditationType: string }>} */
  const partitions = new Map()

  for (const month of months) {
    for (const [material, byType] of Object.entries(served[month].figures)) {
      for (const accreditationType of Object.keys(byType)) {
        partitions.set(`${material}::${accreditationType}`, {
          material,
          accreditationType
        })
      }
    }
  }

  const partitioned = [...partitions.values()]
    .map(({ material, accreditationType }) => ({
      material: getMaterialDisplayName(material),
      accreditationType: localise(
        `regulators:marketInsights:wasteBalance:accreditationTypes:${accreditationType}`
      ),
      periodCounts: period.operatorCounts[material][accreditationType],
      totalNetCredit: period.figures[material][accreditationType].netCredit,
      figures: months.map(
        (month) => served[month].figures[material][accreditationType]
      )
    }))
    .sort(
      (one, other) =>
        one.material.localeCompare(other.material) ||
        one.accreditationType.localeCompare(other.accreditationType)
    )

  const rows = partitioned.map(markedRowOf)

  /** @param {ReportCount} count */
  const stated = ({ expected, submitted }) =>
    localise('regulators:marketInsights:reports:count', {
      submitted,
      expected
    })

  return {
    months: months.map(nameOf),
    rows: rows.map(({ marked: _marked, publishes: _publishes, ...row }) => row),
    reports: {
      byMonth: months.map((month) => stated(served[month].reports)),
      period: stated(period.reports)
    },
    marked: rows.some((row) => row.marked),
    publishedColumn: rows.some((row) => row.publishes)
  }
}
