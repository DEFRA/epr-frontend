import { ACCREDITATION_STATUS } from '#domain/organisations/model.js'
import { calendarDate } from '#server/common/helpers/calendar-date.js'

import { firstDayOf, lastDayOf, later, shiftDay } from './registered-only.js'

/**
 * @import { AccreditationView, RegistrationView, StatusTimeline } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { Stretch } from './registered-only.js'
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
      .map(([at, entry]) => [new Date(at).toISOString().slice(0, 10), entry])
  )

/**
 * @param {AccreditationView} accreditation
 * @returns {[string, { status: string }][]}
 */
const timelineEntries = ({ statusTimeline }) =>
  Object.entries(dailyTimeline(statusTimeline))

/** @type {ReadonlySet<string>} */
const ACCREDITED_STATUSES = new Set([
  ACCREDITATION_STATUS.APPROVED,
  ACCREDITATION_STATUS.SUSPENDED
])

/**
 * The runs of approved or suspended days within the accreditation's year; a status holds until the next entry's date.
 * @param {AccreditationView} accreditation
 * @param {string} year
 * @returns {Stretch[]}
 */
export const accreditedStretches = (accreditation, year) => {
  /** @type {Stretch[]} */
  const stretches = []
  /** @type {Stretch['from'] | null} */
  let from = null

  for (const [date, { status }] of timelineEntries(accreditation)) {
    if (ACCREDITED_STATUSES.has(status) && from === null) {
      from = calendarDate(date)
      continue
    }

    if (status === ACCREDITATION_STATUS.CANCELLED && from !== null) {
      stretches.push({ from, to: shiftDay(calendarDate(date), -1) })
      from = null
    }
  }

  if (from !== null) {
    stretches.push({ from, to: lastDayOf(Number(year)) })
  }

  const firstDay = firstDayOf(Number(year))

  return stretches
    .filter(({ to }) => to.localeCompare(firstDay) >= 0)
    .map((stretch) => ({ ...stretch, from: later(stretch.from, firstDay) }))
}

/**
 * When the registration started.
 * @param {RegistrationView} registration
 * @returns {{ validFrom: string }}
 */
export const registrationDateRange = ({ validFrom }) => ({ validFrom })

/**
 * Every stretch the registration's accreditations covered, across their years.
 * @param {RegistrationView} registration
 * @returns {Stretch[]}
 */
export const registrationAccreditedStretches = ({ accreditations }) =>
  Object.entries(accreditations).flatMap(([year, accreditation]) =>
    accreditedStretches(accreditation, year)
  )
