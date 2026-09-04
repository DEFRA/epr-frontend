/**
 * A bare `YYYY-MM-DD` calendar date.
 *
 * Branded, and lifted from the backend helper of the same name, because the
 * fields that carry one are compared lexicographically: a full ISO datetime
 * sorts *after* the bare date for the same day, so an unnormalised value reads
 * as later than it is and silently drops or keeps the wrong records.
 *
 * `calendarDate` is the only constructor, so a raw string cannot reach a
 * comparison without being normalised on the way in.
 * @typedef {string & { readonly __brand: 'CalendarDate' }} CalendarDate
 */

/**
 * The calendar date a stored value names, tolerant of either a bare date or a
 * full ISO datetime — older persisted documents carry the latter, from
 * historical Joi coercion, so a caller cannot know which shape it has. Slicing
 * to the first ten characters means it never has to.
 * @param {string} value
 * @returns {CalendarDate}
 */
export const calendarDate = (value) =>
  /** @type {CalendarDate} */ (value.slice(0, 10))

/**
 * The calendar date an instant falls on **in UTC**. Named for the zone because
 * the answer is zone-dependent: half past midnight on a British summer morning
 * is still the previous day in UTC.
 * @param {Date} date
 * @returns {CalendarDate}
 */
export const utcCalendarDate = (date) => calendarDate(date.toISOString())
