/**
 * @import { DateRange } from '#server/common/helpers/organisations/registration-resource.js'
 * @import { AccreditationResource } from './types.js'
 */

/**
 * @typedef {{ from: string, to: string }} Stretch
 */

/**
 * A date as the records carry it, which is a day rather than an instant. Every
 * comparison here is between two such values, so they are compared as strings:
 * `YYYY-MM-DD` sorts lexicographically in date order, and parsing would only
 * add a timezone to get wrong.
 * @param {Date} date
 * @returns {string}
 */
const toDay = (date) => date.toISOString().slice(0, 10)

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
 * does — so the list always runs to the current year and grows each January.
 * The resource still carries a `validTo`, and it is deliberately not read: see
 * PAE-1904, which removes it.
 *
 * A registration is given its `validFrom` when it is approved, so one that has
 * not been approved has existed over no year a regulator can open.
 * @param {{ dateRange: DateRange, now?: Date }} params
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
  const from = validFrom > `${year}-01-01` ? validFrom : `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const to = today < yearEnd ? today : yearEnd

  return from > to ? null : { from, to }
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
 * Removes one occupied stretch from the stretches still unaccounted for. A
 * stretch the accreditation covers entirely disappears; one it splits leaves
 * the days either side of it.
 * @param {Stretch[]} remaining
 * @param {Stretch} occupied
 * @returns {Stretch[]}
 */
const subtract = (remaining, occupied) =>
  remaining.flatMap((stretch) => {
    if (occupied.to < stretch.from || occupied.from > stretch.to) {
      return [stretch]
    }

    /** @type {Stretch[]} */
    const kept = []

    if (occupied.from > stretch.from) {
      kept.push({ from: stretch.from, to: shiftDay(occupied.from, -1) })
    }

    if (occupied.to < stretch.to) {
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
 *   dateRange: DateRange,
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

  return accreditedStretches(accreditations, today).reduce(subtract, [
    registered
  ])
}
