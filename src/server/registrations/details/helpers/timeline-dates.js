import {
  ACCREDITATION_STATUS,
  REGISTRATION_STATUS
} from '#domain/organisations/model.js'
import {
  calendarDate,
  utcCalendarDate
} from '#server/common/helpers/calendar-date.js'

import {
  earlier,
  firstDayOf,
  lastDayOf,
  later,
  shiftDay,
  yearOf
} from './registered-only.js'

/**
 * @import { CalendarDate } from '#server/common/helpers/calendar-date.js'
 * @import { AccreditationView, RegistrationView, StatusTimeline } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { Stretch } from './registered-only.js'
 */

/**
 * A run of live days; one still live has no end.
 * @typedef {{ from: CalendarDate, to: CalendarDate | null }} Run
 */

/**
 * The last status on each UTC day, keyed by `YYYY-MM-DD`.
 * @param {StatusTimeline} timeline
 * @returns {Record<string, { status: string }>}
 */
export const dailyTimeline = (timeline) =>
  Object.fromEntries(
    Object.entries(timeline)
      .sort(([one], [other]) => one.localeCompare(other))
      .map(([at, entry]) => [calendarDate(at), entry])
  )

/**
 * The runs of days holding a live status; any other status ends a run the day before.
 * @param {StatusTimeline} timeline
 * @param {ReadonlySet<string>} liveStatuses
 * @returns {Run[]}
 */
const liveRuns = (timeline, liveStatuses) => {
  /** @type {Run[]} */
  const runs = []
  /** @type {CalendarDate | null} */
  let from = null

  for (const [date, { status }] of Object.entries(dailyTimeline(timeline))) {
    if (liveStatuses.has(status)) {
      from ??= calendarDate(date)
      continue
    }

    if (from !== null) {
      runs.push({ from, to: shiftDay(calendarDate(date), -1) })
      from = null
    }
  }

  return from === null ? runs : [...runs, { from, to: null }]
}

/**
 * The runs clipped to the bounds, dropping any left empty.
 * @param {Run[]} runs
 * @param {Stretch} bounds
 * @returns {Stretch[]}
 */
const clip = (runs, bounds) =>
  runs
    .map(({ from, to }) => ({
      from: later(from, bounds.from),
      to: earlier(to ?? bounds.to, bounds.to)
    }))
    .filter(({ from, to }) => from.localeCompare(to) <= 0)

/** @type {ReadonlySet<string>} */
const ACCREDITED_STATUSES = new Set([
  ACCREDITATION_STATUS.APPROVED,
  ACCREDITATION_STATUS.SUSPENDED
])

/** @type {ReadonlySet<string>} */
const REGISTERED_STATUSES = new Set([REGISTRATION_STATUS.APPROVED])

/**
 * The runs of approved or suspended days within the accreditation's year.
 * @param {AccreditationView} accreditation
 * @param {string} year
 * @returns {Stretch[]}
 */
export const accreditedStretches = ({ status }, year) =>
  clip(liveRuns(status.timeline, ACCREDITED_STATUSES), {
    from: firstDayOf(Number(year)),
    to: lastDayOf(Number(year))
  })

/**
 * 1 January if accredited going into the year, else the first approval in it.
 * Reads every entry, so an approval superseded the same day still counts.
 * @param {StatusTimeline} statusTimeline
 * @param {CalendarDate} yearStart
 * @returns {CalendarDate}
 */
const accreditedFrom = (statusTimeline, yearStart) => {
  const liveAtYearStart = liveRuns(statusTimeline, ACCREDITED_STATUSES).some(
    ({ from, to }) =>
      from.localeCompare(yearStart) < 0 &&
      (to === null || to.localeCompare(yearStart) >= 0)
  )

  if (liveAtYearStart) {
    return yearStart
  }

  const approvedAt = /** @type {string} */ (
    Object.keys(statusTimeline)
      .sort((one, other) => one.localeCompare(other))
      .find(
        (at) =>
          statusTimeline[at].status === ACCREDITATION_STATUS.APPROVED &&
          calendarDate(at).localeCompare(yearStart) >= 0
      )
  )

  return calendarDate(approvedAt)
}

/**
 * The period an accreditation is shown as covering within its year.
 * @param {AccreditationView} accreditation
 * @param {string} year
 * @returns {{ validFrom: string, validTo: string }}
 */
export const accreditedDateRange = ({ status: { timeline } }, year) => {
  const [lastDate, { status }] = /** @type {[string, { status: string }]} */ (
    Object.entries(dailyTimeline(timeline)).at(-1)
  )

  return {
    validFrom: accreditedFrom(timeline, firstDayOf(Number(year))),
    validTo:
      status === ACCREDITATION_STATUS.CANCELLED
        ? lastDate
        : lastDayOf(Number(year))
  }
}

/**
 * The registration's approved runs up to today.
 * @param {RegistrationView} registration
 * @param {CalendarDate} today
 * @returns {Stretch[]}
 */
const registeredRunsToDate = ({ status }, today) =>
  liveRuns(status.timeline, REGISTERED_STATUSES)
    .map(({ from, to }) => ({ from, to: earlier(to ?? today, today) }))
    .filter(({ from, to }) => from.localeCompare(to) <= 0)

/**
 * The years holding at least one approved day up to today, most recent first.
 * @param {RegistrationView} registration
 * @param {Date} [now]
 * @returns {number[]}
 */
export const registeredYears = (registration, now = new Date()) => {
  const years = registeredRunsToDate(
    registration,
    utcCalendarDate(now)
  ).flatMap(({ from, to }) =>
    Array.from(
      { length: yearOf(to) - yearOf(from) + 1 },
      (_, offset) => yearOf(from) + offset
    )
  )

  return [...new Set(years)].sort((one, other) => other - one)
}

/**
 * The registration's approved runs within the year, and up to today.
 * @param {RegistrationView} registration
 * @param {number} year
 * @param {Date} [now]
 * @returns {Stretch[]}
 */
export const registeredStretches = (registration, year, now = new Date()) =>
  clip(registeredRunsToDate(registration, utcCalendarDate(now)), {
    from: firstDayOf(year),
    to: lastDayOf(year)
  })

/**
 * Every stretch the registration's accreditations covered, across their years.
 * @param {RegistrationView} registration
 * @returns {Stretch[]}
 */
export const registrationAccreditedStretches = ({ accreditations }) =>
  Object.entries(accreditations).flatMap(([year, accreditation]) =>
    accreditedStretches(accreditation, year)
  )
