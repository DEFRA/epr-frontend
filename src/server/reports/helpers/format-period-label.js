import { CADENCE } from '../constants.js'

/**
 * @import { CadenceValue } from '../constants.js'
 * @import { ReportingPeriod } from './fetch-reporting-periods.js'
 */

/**
 * @typedef {Pick<ReportingPeriod, 'year' | 'period'>} PeriodRef
 * @typedef {(key: string, params?: Record<string, unknown>) => string} Localise
 */

/**
 * Formats a reporting period into a display label.
 * Monthly: "January 2026", Quarterly: "Quarter 1, 2026"
 * @param {PeriodRef} period
 * @param {CadenceValue} cadence
 * @param {Localise} localise
 * @returns {string}
 */
export function formatPeriodLabel(period, cadence, localise) {
  if (cadence === CADENCE.MONTHLY) {
    const month = localise(`reports:months.${period.period}`)
    return `${month} ${period.year}`
  }

  return localise('reports:quarterlyPeriod', {
    number: period.period,
    year: period.year
  })
}

/**
 * Formats a reporting period into a shorter display label without the year.
 * Monthly: "January", Quarterly: "Quarter 1"
 * @param {PeriodRef} period
 * @param {CadenceValue} cadence
 * @param {Localise} localise
 * @returns {string}
 */
export function formatPeriodShort(period, cadence, localise) {
  if (cadence === CADENCE.MONTHLY) {
    return localise(`reports:months.${period.period}`)
  }

  return localise('reports:quarterlyPeriodShort', {
    number: period.period
  })
}
