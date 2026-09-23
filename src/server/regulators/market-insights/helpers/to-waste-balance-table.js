import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'

import { fewOperatorsOf } from './few-operators.js'
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
 * The period as the backend serves it: the reports it was owed, and the
 * operator counts behind each row's total across its months.
 * @typedef {{
 *   months: Record<string, PublishedMonth>,
 *   period: {
 *     reports: ReportCount,
 *     operatorCounts: Record<string, Record<string, OperatorCounts>>
 *   }
 * }} WasteBalanceData
 */

/**
 * A formatted figure, and the operator counts where few operators contributed
 * to it.
 * @typedef {{ figure: string, fewOperators: string | undefined }} MarkedFigure
 */

/**
 * @typedef {{
 *   material: string,
 *   accreditationType: string,
 *   netCredits: MarkedFigure[],
 *   total: MarkedFigure
 * }} WasteBalanceRow
 */

/**
 * @typedef {{
 *   months: string[],
 *   rows: WasteBalanceRow[],
 *   reports: { byMonth: string[], period: string }
 * }} WasteBalanceTable
 */

/**
 * Lays the served figures out the way the published Waste Balance tab is: one
 * row per material and accreditation type, the reporting months across as
 * columns, and the net credit in the cells, with a row beneath saying how many
 * of the reports each month expected the figures include.
 *
 * The pivot is presentation. Every figure in a cell is the one the service
 * served for that month, and the only sum is the row total across them; the
 * period's report count is served, not added up here.
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

  const rows = [...partitions.values()]
    .map(({ material, accreditationType }) => ({
      material: getMaterialDisplayName(material),
      accreditationType: localise(
        `regulators:marketInsights:wasteBalance:accreditationTypes:${accreditationType}`
      ),
      periodCounts: period.operatorCounts[material][accreditationType],
      figures: months.map(
        (month) => served[month].figures[material][accreditationType]
      )
    }))
    .sort(
      (one, other) =>
        one.material.localeCompare(other.material) ||
        one.accreditationType.localeCompare(other.accreditationType)
    )
    .map(({ figures, periodCounts, ...row }) => ({
      ...row,
      netCredits: figures.map((figure) => ({
        figure: formatTonnage(figure.netCredit),
        fewOperators: fewOperatorsOf(figure, localise)
      })),
      total: {
        figure: formatTonnage(
          figures.reduce((sum, { netCredit }) => sum + netCredit, 0)
        ),
        fewOperators: fewOperatorsOf(periodCounts, localise)
      }
    }))

  /** @param {ReportCount} count */
  const stated = ({ expected, submitted }) =>
    localise('regulators:marketInsights:reports:count', {
      submitted,
      expected
    })

  return {
    months: months.map(nameOf),
    rows,
    reports: {
      byMonth: months.map((month) => stated(served[month].reports)),
      period: stated(period.reports)
    }
  }
}
