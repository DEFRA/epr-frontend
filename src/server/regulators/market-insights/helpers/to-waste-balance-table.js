import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'

import {
  fromFewOperators,
  leavesOutConfidential,
  markedFigureOf
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
 * accredited for it. A total the published workbook shows without its
 * confidential months says so in the row's note, which is otherwise empty.
 * @typedef {{
 *   material: string,
 *   accreditationType: string,
 *   netCredits: string[],
 *   total: string,
 *   note: string
 * }} WasteBalanceRow
 */

/**
 * The table has a column of notes when any row's total leaves out confidential
 * months.
 * @typedef {{
 *   months: string[],
 *   rows: WasteBalanceRow[],
 *   reports: { byMonth: string[], period: string },
 *   marked: boolean,
 *   noted: boolean
 * }} WasteBalanceTable
 */

/**
 * A row's figures, before its own marked and noted states are stripped for
 * display.
 * @typedef {Omit<WasteBalanceRow, 'note'> & { marked: boolean, noted: boolean }} MarkedWasteBalanceRow
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
  const monthMarked = figures.some((figure) =>
    fromFewOperators(figure, figure.netCredit !== 0)
  )
  const totalMarked = fromFewOperators(periodCounts, totalNetCredit !== 0)
  const total = markedFigureOf(
    formatTonnage(totalNetCredit),
    periodCounts,
    totalNetCredit !== 0
  )
  const noted = leavesOutConfidential(monthMarked, totalMarked)

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
    marked: monthMarked || totalMarked,
    noted
  }
}

/**
 * Lays the served figures out the way the published Waste Balance tab is: one
 * row per material and accreditation type, the reporting months across as
 * columns, and the net credit in the cells, with a row beneath saying how many
 * of the reports each month expected the figures include.
 *
 * The pivot is presentation. Every figure, including a row's total across its
 * months and the period's report count, is the one the service served;
 * nothing here is summed.
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
    rows: rows.map(({ marked: _marked, noted, ...row }) => ({
      ...row,
      note: noted
        ? localise(
            'regulators:marketInsights:wasteBalance:table:withoutConfidential'
          )
        : ''
    })),
    reports: {
      byMonth: months.map((month) => stated(served[month].reports)),
      period: stated(period.reports)
    },
    marked: rows.some((row) => row.marked),
    noted: rows.some((row) => row.noted)
  }
}
