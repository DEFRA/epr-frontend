import { CADENCE_MONTHLY } from '../constants.js'

const MONTHS_PER_QUARTER = 3

/**
 * Formats a reporting period into a display label.
 * Monthly: "January 2026", Quarterly: "January to March 2026"
 * @param {import('./fetch-reporting-periods.js').ReportingPeriod} period
 * @param {string} cadence
 * @param {(key: string, params?: Record<string, unknown>) => string} localise
 * @returns {string}
 */
export function formatPeriodLabel(period, cadence, localise) {
  const month = localise(`reports:months.${period.period}`)

  if (cadence === CADENCE_MONTHLY) {
    return `${month} ${period.year}`
  }

  const startMonth = (period.period - 1) * MONTHS_PER_QUARTER + 1
  const endMonth = startMonth + MONTHS_PER_QUARTER - 1

  const start = localise(`reports:months.${startMonth}`)
  const end = localise(`reports:months.${endMonth}`)
  const to = localise('reports:quarterlyTo')

  return `${start} ${to} ${end} ${period.year}`
}
