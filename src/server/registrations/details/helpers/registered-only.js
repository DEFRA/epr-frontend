import {
  calendarDate,
  utcCalendarDate
} from '#server/common/helpers/calendar-date.js'

/**
 * @import { CalendarDate } from '#server/common/helpers/calendar-date.js'
 * @import { RegistrationDateRange } from '#server/common/helpers/organisations/registration-resource.js'
 */

/**
 * @typedef {{ from: CalendarDate, to: CalendarDate }} Stretch
 */

/**
 * Every date here is a `CalendarDate`, which sorts in date order as a string.
 * They are ordered with `localeCompare` rather than `<` and `>`: the relational
 * operators coerce, so comparing two strings with them reads as an accident
 * even when it is not. Parsing to `Date` instead would only add a timezone to
 * get wrong.
 *
 * The brand is what makes that safe. A raw stored value may be a bare date or a
 * full ISO datetime, and the datetime sorts after the bare date for the same
 * day — so every one is normalised through `calendarDate` before it reaches a
 * comparison, and the type stops one that was not.
 * @param {CalendarDate} day
 * @param {CalendarDate} other
 * @returns {boolean}
 */
const isBefore = (day, other) => day.localeCompare(other) < 0

/**
 * @param {CalendarDate} day
 * @param {CalendarDate} other
 * @returns {boolean}
 */
const isAfter = (day, other) => day.localeCompare(other) > 0

/**
 * @param {CalendarDate} day
 * @param {CalendarDate} other
 * @returns {CalendarDate}
 */
export const later = (day, other) => (isAfter(day, other) ? day : other)

/**
 * @param {CalendarDate} day
 * @param {CalendarDate} other
 * @returns {CalendarDate}
 */
export const earlier = (day, other) => (isBefore(day, other) ? day : other)

/**
 * @param {CalendarDate} day
 * @returns {number}
 */
export const yearOf = (day) => new Date(day).getUTCFullYear()

/**
 * The first day of a year, as a calendar date.
 * @param {number} year
 * @returns {CalendarDate}
 */
export const firstDayOf = (year) => calendarDate(`${year}-01-01`)

/**
 * The last day of a year, as a calendar date.
 * @param {number} year
 * @returns {CalendarDate}
 */
export const lastDayOf = (year) => calendarDate(`${year}-12-31`)

/**
 * @param {CalendarDate} day
 * @param {number} days
 * @returns {CalendarDate}
 */
export const shiftDay = (day, days) => {
  const shifted = new Date(day)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return utcCalendarDate(shifted)
}

/**
 * The years a registration has existed over, most recent first.
 *
 * A registration has no end date — it does not expire the way an accreditation
 * does (PAE-1904) — so the list always runs to the current year and grows each
 * January.
 * @param {{ dateRange: RegistrationDateRange, now?: Date }} params
 * @returns {number[]}
 */
export const registrationYears = ({ dateRange, now = new Date() }) => {
  const firstYear = yearOf(calendarDate(dateRange.validFrom))
  const lastYear = now.getUTCFullYear()

  // A registration granted ahead of the year it covers has not existed over
  // any year yet, which `Array.from` answers as an empty list without a guard.
  return Array.from(
    { length: lastYear - firstYear + 1 },
    (_, offset) => lastYear - offset
  )
}

/**
 * Whether two stretches share at least one day.
 * @param {Stretch} one
 * @param {Stretch} other
 * @returns {boolean}
 */
const overlaps = (one, other) =>
  !isAfter(one.from, other.to) && !isBefore(one.to, other.from)

/**
 * Removes one occupied stretch from the stretches still unaccounted for. A
 * stretch the accreditation covers entirely disappears; one it splits leaves
 * the days either side of it.
 * @param {Stretch[]} remaining
 * @param {Stretch} occupied
 * @returns {Stretch[]}
 */
const subtract = (remaining, occupied) =>
  remaining.flatMap((stretch) => {
    if (!overlaps(stretch, occupied)) {
      return [stretch]
    }

    /** @type {Stretch[]} */
    const kept = []

    if (isAfter(occupied.from, stretch.from)) {
      kept.push({ from: stretch.from, to: shiftDay(occupied.from, -1) })
    }

    if (isBefore(occupied.to, stretch.to)) {
      kept.push({ from: shiftDay(occupied.to, 1), to: stretch.to })
    }

    return kept
  })

/**
 * The registered stretches with every accredited day removed.
 *
 * Both bounds of every stretch are inclusive. An empty result means the year
 * holds no registered-only time at all, which is what a page shows the "this
 * period holds no data" message for.
 * @param {{ registered: Stretch[], accredited: Stretch[] }} params
 * @returns {Stretch[]}
 */
export const registeredOnlyStretches = ({ registered, accredited }) =>
  // Wrapped rather than passed directly: `reduce` also hands the callback the
  // index and the array, and `subtract` takes two arguments.
  accredited.reduce(
    (remaining, occupied) => subtract(remaining, occupied),
    registered
  )
