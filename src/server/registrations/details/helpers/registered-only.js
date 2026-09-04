/**
 * @import { RegistrationDateRange } from '#server/common/helpers/organisations/registration-resource.js'
 * @import { AccreditationResource } from './types.js'
 */

/**
 * @typedef {{ from: string, to: string }} Stretch
 */

/**
 * A date as the records carry it, which is a day rather than an instant.
 * @param {Date} date
 * @returns {string}
 */
const toDay = (date) => date.toISOString().slice(0, 10)

/**
 * Every date here is a `YYYY-MM-DD` day, which sorts in date order as a string.
 * They are ordered with `localeCompare` rather than `<` and `>`: the relational
 * operators coerce, so comparing two strings with them reads as an accident
 * even when it is not. Parsing to `Date` instead would only add a timezone to
 * get wrong.
 * @param {string} day
 * @param {string} other
 * @returns {boolean}
 */
const isBefore = (day, other) => day.localeCompare(other) < 0

/**
 * @param {string} day
 * @param {string} other
 * @returns {boolean}
 */
const isAfter = (day, other) => day.localeCompare(other) > 0

/**
 * @param {string} day
 * @param {string} other
 * @returns {string}
 */
const later = (day, other) => (isAfter(day, other) ? day : other)

/**
 * @param {string} day
 * @param {string} other
 * @returns {string}
 */
const earlier = (day, other) => (isBefore(day, other) ? day : other)

/**
 * @param {string} day
 * @returns {number}
 */
const yearOf = (day) => new Date(day).getUTCFullYear()

/**
 * @param {string} day
 * @param {number} days
 * @returns {string}
 */
const shiftDay = (day, days) => {
  const shifted = new Date(day)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return toDay(shifted)
}

/**
 * The years a registration has existed over, most recent first.
 *
 * A registration has no end date — it does not expire the way an accreditation
 * does (PAE-1904) — so the list always runs to the current year and grows each
 * January.
 *
 * A registration is given its `validFrom` when it is approved, so one that has
 * not been approved has existed over no year a regulator can open.
 * @param {{ dateRange: RegistrationDateRange, now?: Date }} params
 * @returns {number[]}
 */
export const registrationYears = ({ dateRange, now = new Date() }) => {
  const { validFrom } = dateRange

  if (!validFrom) {
    return []
  }

  const firstYear = yearOf(validFrom)
  const lastYear = now.getUTCFullYear()

  // A registration granted ahead of the year it covers has not existed over
  // any year yet, which `Array.from` answers as an empty list without a guard.
  return Array.from(
    { length: lastYear - firstYear + 1 },
    (_, offset) => lastYear - offset
  )
}

/**
 * The stretch of a year the registration was live over. It opens when the
 * registration did, or on 1 January if that was earlier, and closes today or on
 * 31 December, whichever comes first — a year that has not finished is only
 * registered up to today.
 * @param {{ validFrom: string, year: number, today: string }} params
 * @returns {Stretch | null}
 */
const registeredStretch = ({ validFrom, year, today }) => {
  const from = later(validFrom, `${year}-01-01`)
  const to = earlier(today, `${year}-12-31`)

  return isAfter(from, to) ? null : { from, to }
}

/**
 * The stretches an accreditation occupied, clipped to nothing outside itself.
 *
 * Its `validFrom` is what says it occupied time, not its status: the dates are
 * recorded at approval, so an accreditation that never got them never ran. One
 * that was later **cancelled** keeps both, and did run over the period it
 * names — which is why this cannot key on the current status the way
 * `isRegistrationAccredited` does.
 * @param {AccreditationResource[]} accreditations
 * @param {string} today
 * @returns {Stretch[]}
 */
const accreditedStretches = (accreditations, today) =>
  accreditations.flatMap(({ dateRange }) =>
    dateRange.validFrom
      ? [{ from: dateRange.validFrom, to: dateRange.validTo ?? today }]
      : []
  )

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
 * The periods within one year that the operator held a registration and no
 * accreditation.
 *
 * Both bounds of every stretch are inclusive. An empty result means the year
 * holds no registered-only time at all, which is what a page shows the "this
 * period holds no data" message for.
 * @param {{
 *   dateRange: RegistrationDateRange,
 *   accreditations: AccreditationResource[],
 *   year: number,
 *   now?: Date
 * }} params
 * @returns {Stretch[]}
 */
export const registeredOnlyStretches = ({
  dateRange,
  accreditations,
  year,
  now = new Date()
}) => {
  const { validFrom } = dateRange

  if (!validFrom) {
    return []
  }

  const today = toDay(now)
  const registered = registeredStretch({ validFrom, year, today })

  if (!registered) {
    return []
  }

  // Wrapped rather than passed directly: `reduce` also hands the callback the
  // index and the array, and `subtract` takes two arguments.
  return accreditedStretches(accreditations, today).reduce(
    (remaining, occupied) => subtract(remaining, occupied),
    [registered]
  )
}
