import { cssClasses } from '#server/common/constants/css-classes.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { SUBMISSION_STATUS } from '#server/reports/constants.js'
import { buildActionLinkHtml } from '#server/reports/helpers/build-action-link-html.js'
import { buildStatusTagHtml } from '#server/reports/helpers/build-status-tag-html.js'
import { formatPeriodLabelWithComma } from '#server/reports/helpers/format-period-label.js'
import { formatSubmittedDateTime } from '#server/reports/helpers/format-submitted-date-time.js'

/**
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { Localise } from './types.js'
 */

/**
 * @typedef {{ text: string, classes?: string } | { html: string, classes?: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {{ head: TableRow, rows: TableRow[] }} ReportsTable
 */

/**
 * Column headings in the design's order; the action column hugs its link.
 * @param {{ localise: Localise, namespace: string }} params
 * @returns {TableRow}
 */
export const toReportsHead = ({ localise, namespace }) => [
  {
    text: localise(`${namespace}:period`),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise(`${namespace}:dueDate`),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise(`${namespace}:submissionDate`),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise(`${namespace}:status`),
    classes: cssClasses.width.oneQuarter
  },
  {
    text: localise(`${namespace}:actions`),
    classes: cssClasses.textAlign.right
  }
]

/**
 * Newest period first, whatever order the calendar answered in.
 * @param {ReportingPeriod} a
 * @param {ReportingPeriod} b
 * @returns {number}
 */
const mostRecentFirst = (a, b) => b.year - a.year || b.period - a.period

/**
 * Only a submitted period has a report to read, so every other row's action
 * cell is empty rather than linking at nothing. The link carries the period it
 * belongs to, so a page of otherwise identical links stays distinguishable.
 * @param {{
 *   label: string,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   period: ReportingPeriod,
 *   periodPath: (period: ReportingPeriod) => string
 * }} params
 * @returns {TableCell}
 */
const toActionCell = ({ label, localise, localiseUrl, period, periodPath }) => {
  if (period.periodStatus !== SUBMISSION_STATUS.SUBMITTED) {
    return { text: '', classes: cssClasses.textAlign.right }
  }

  const url = localiseUrl(`${periodPath(period)}/view`)

  return {
    html: buildActionLinkHtml(localise('reports:actionView'), url, label),
    classes: cssClasses.textAlign.right
  }
}

/**
 * One row per reporting period given, newest first. Callers pick the periods
 * that belong on their page.
 * @param {{
 *   cadence: CadenceValue,
 *   localise: Localise,
 *   localiseUrl: (path: string) => string,
 *   periodPath: (period: ReportingPeriod) => string,
 *   reportingPeriods: ReportingPeriod[]
 * }} params
 * @returns {TableRow[]}
 */
export const toReportRows = ({
  cadence,
  localise,
  localiseUrl,
  periodPath,
  reportingPeriods
}) =>
  [...reportingPeriods].sort(mostRecentFirst).map((period) => {
    const label = formatPeriodLabelWithComma(period, cadence, localise)

    return [
      { text: label },
      { text: formatDateShort(period.dueDate) },
      { text: formatSubmittedDateTime(period.report?.submittedAt) },
      {
        html: buildStatusTagHtml(
          period.periodStatus,
          localise,
          period.submissionNumber
        )
      },
      toActionCell({ label, localise, localiseUrl, period, periodPath })
    ]
  })
