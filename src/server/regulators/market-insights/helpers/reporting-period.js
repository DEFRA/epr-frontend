import { UK_TIME_ZONE } from '#server/common/helpers/format-time.js'

/**
 * The span of reporting months a page shows: the year it belongs to, and every
 * month of that year that has finished, as `YYYY-MM` keys in calendar order.
 * @typedef {{ year: number, months: string[] }} ReportingPeriod
 */

const ukYearMonth = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'numeric',
  timeZone: UK_TIME_ZONE
})

const monthName = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  timeZone: 'UTC'
})

/**
 * Names the month a `YYYY-MM` key stands for. The key carries no day, so it is
 * read at the start of the month in UTC and the zone is stated rather than
 * left to the host, which would name the month before it west of Greenwich.
 * @param {string} month
 * @returns {string}
 */
export const nameOf = (month) =>
  monthName.format(new Date(`${month}-01T00:00:00Z`))

/**
 * The reporting period the publication is currently accumulating: the calendar
 * year in progress, and the months of it that have finished.
 *
 * A month still running is left out. The published tab stops at the last
 * complete month, so a part-month column sitting unmarked beside whole ones
 * would read as a collapse in supply rather than as days still to come.
 * @returns {ReportingPeriod}
 */
export const reportingPeriodNow = () => {
  /** @type {Record<string, string>} */
  const parts = ukYearMonth
    .formatToParts(new Date())
    .reduce((acc, { type, value }) => ({ ...acc, [type]: value }), {})

  const year = Number(parts.year)

  return {
    year,
    months: Array.from(
      { length: Number(parts.month) - 1 },
      (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`
    )
  }
}

/**
 * States which months the figures cover, so a regulator holding the page
 * beside the workbook can see the two were cut over the same span.
 * @param {ReportingPeriod} period
 * @param {(key: string, values?: Record<string, string | number>) => string} localise
 * @returns {string}
 */
export const describeReportingPeriod = ({ year, months }, localise) => {
  if (months.length === 0) {
    return localise('regulators:marketInsights:period:year', { year })
  }

  if (months.length === 1) {
    return localise('regulators:marketInsights:period:month', {
      month: nameOf(months[0]),
      year
    })
  }

  return localise('regulators:marketInsights:period:months', {
    from: nameOf(months[0]),
    to: nameOf(months[months.length - 1]),
    year
  })
}
