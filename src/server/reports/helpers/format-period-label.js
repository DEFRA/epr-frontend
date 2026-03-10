import { CADENCE_MONTHLY } from '../constants.js'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

/**
 * Formats a reporting period into a display label.
 * Monthly: "January 2026", Quarterly: "January to March 2026"
 * @param {import('./fetch-reporting-periods.js').ReportingPeriod} period
 * @param {string} cadence
 * @returns {string}
 */
export function formatPeriodLabel(period, cadence) {
  if (cadence === CADENCE_MONTHLY) {
    return `${MONTH_NAMES[period.period - 1]} ${period.year}`
  }

  const index = (period.period - 1) * 3
  return `${MONTH_NAMES[index]} to ${MONTH_NAMES[index + 2]} ${period.year}`
}
