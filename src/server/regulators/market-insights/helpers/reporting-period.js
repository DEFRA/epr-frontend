import { UK_TIME_ZONE } from '#server/common/helpers/format-time.js'

/**
 * One calendar month, the month as its number.
 * @typedef {{ year: number, month: number }} CalendarMonth
 */

/**
 * The span of reporting months a page shows: the year it belongs to, the last
 * month of the span as its number, and every month from January to it as
 * `YYYY-MM` keys in calendar order.
 * @typedef {{ year: number, month: number, months: string[] }} ReportingPeriod
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

const MONTHS_IN_A_YEAR = 12

/**
 * The first month the publication holds figures for. It is cumulative from
 * here and no earlier data exists, so nothing needs to discover the floor.
 * @type {CalendarMonth}
 */
const EARLIEST_MONTH = { year: 2026, month: 1 }

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
 * The `YYYY-MM` key a month is served under.
 * @param {CalendarMonth} calendarMonth
 * @returns {string}
 */
const keyOf = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}`

/**
 * Months as a count from year zero, so two can be compared and stepped
 * without minding the year boundary.
 * @param {CalendarMonth} calendarMonth
 * @returns {number}
 */
const ordinalOf = ({ year, month }) => year * MONTHS_IN_A_YEAR + month - 1

/**
 * @param {number} ordinal
 * @returns {CalendarMonth}
 */
const fromOrdinal = (ordinal) => ({
  year: Math.floor(ordinal / MONTHS_IN_A_YEAR),
  month: (ordinal % MONTHS_IN_A_YEAR) + 1
})

/**
 * The most recent month that has ended in UK time, which is the latest the
 * page will show.
 *
 * A month still running is left out. The published tab stops at the last
 * complete month, so a part-month column sitting unmarked beside whole ones
 * would read as a collapse in supply rather than as days still to come.
 * @returns {CalendarMonth}
 */
export const lastCompleteMonth = () => {
  /** @type {Record<string, string>} */
  const parts = ukYearMonth
    .formatToParts(new Date())
    .reduce((acc, { type, value }) => ({ ...acc, [type]: value }), {})

  return fromOrdinal(
    ordinalOf({ year: Number(parts.year), month: Number(parts.month) }) - 1
  )
}

/**
 * The reporting period that ends in a month: January of its year through to
 * it. The year is the month's own, which is what carries January: a page
 * showing December reads as the year that has just closed in full.
 * @param {CalendarMonth} calendarMonth
 * @returns {ReportingPeriod}
 */
export const reportingPeriod = ({ year, month }) => ({
  year,
  month,
  months: Array.from({ length: month }, (_, index) =>
    keyOf({ year, month: index + 1 })
  )
})

/**
 * Whether the page will show a month: one from January 2026 to the last
 * complete month.
 * @param {CalendarMonth} calendarMonth
 * @returns {boolean}
 */
export const isNavigable = (calendarMonth) => {
  const ordinal = ordinalOf(calendarMonth)

  return (
    ordinal >= ordinalOf(EARLIEST_MONTH) &&
    ordinal <= ordinalOf(lastCompleteMonth())
  )
}

/**
 * The months either side of one, as far as the page will go.
 * @param {CalendarMonth} calendarMonth
 * @returns {{ previous?: CalendarMonth, next?: CalendarMonth }}
 */
export const adjacentMonths = (calendarMonth) => {
  const ordinal = ordinalOf(calendarMonth)

  return {
    ...(ordinal > ordinalOf(EARLIEST_MONTH) && {
      previous: fromOrdinal(ordinal - 1)
    }),
    ...(ordinal < ordinalOf(lastCompleteMonth()) && {
      next: fromOrdinal(ordinal + 1)
    })
  }
}

/**
 * Names a month with its year, as a link to it reads.
 * @param {CalendarMonth} calendarMonth
 * @param {(key: string, values?: Record<string, string | number>) => string} localise
 * @returns {string}
 */
export const describeMonth = ({ year, month }, localise) =>
  localise('regulators:marketInsights:period:month', {
    month: nameOf(keyOf({ year, month })),
    year
  })

/**
 * States which months the figures cover, so a regulator holding the page
 * beside the workbook can see the two were cut over the same span.
 * @param {ReportingPeriod} period
 * @param {(key: string, values?: Record<string, string | number>) => string} localise
 * @returns {string}
 */
export const describeReportingPeriod = ({ year, months }, localise) => {
  const [first, ...rest] = months
  const last = rest.at(-1)

  return last === undefined
    ? localise('regulators:marketInsights:period:month', {
        month: nameOf(first),
        year
      })
    : localise('regulators:marketInsights:period:months', {
        from: nameOf(first),
        to: nameOf(last),
        year
      })
}
