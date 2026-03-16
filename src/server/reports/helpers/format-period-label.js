import { CADENCE_MONTHLY } from '../constants.js'

/**
 * Formats a reporting period into a display label.
 * Monthly: "January 2026", Quarterly: "Quarter 1, 2026"
 * @param {import('./fetch-reporting-periods.js').ReportingPeriod} period
 * @param {string} cadence
 * @param {(key: string, params?: Record<string, unknown>) => string} localise
 * @returns {string}
 */
export function formatPeriodLabel(period, cadence, localise) {
  if (cadence === CADENCE_MONTHLY) {
    const month = localise(`reports:months.${period.period}`)
    return `${month} ${period.year}`
  }

  return localise('reports:quarterlyPeriod', {
    number: period.period,
    year: period.year
  })
}
