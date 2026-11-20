/**
 * The zones this service reads a date in. A caller names one rather than
 * passing free text, so a zone Intl would reject cannot reach the formatter.
 * @typedef {'UTC' | 'Europe/London'} SupportedTimeZone
 */

/**
 * @typedef {{
 *   includeYear?: boolean,
 *   dayStyle?: Intl.DateTimeFormatOptions['day'],
 *   monthStyle?: Intl.DateTimeFormatOptions['month'],
 *   timeZone?: SupportedTimeZone
 * }} FormatDateOptions
 */

/**
 * Format an ISO timestamp to a human-readable date.
 * e.g. "2026-02-15T15:09:00.000Z" → "15 February 2026" (default)
 * e.g. "2026-02-15T15:09:00.000Z" → "15 February" (includeYear: false)
 * e.g. "2026-02-05" → "05/02/2026" (dayStyle: '2-digit', monthStyle: '2-digit')
 *
 * The default is UTC because that is what every caller read before the zone
 * became a choice, and moving them is a decision of its own. A caller that
 * holds a moment and shows the time of day beside the date passes the zone
 * that time is read in, so the two halves name the same day. A caller that
 * holds a date rather than a moment wants UTC: a local zone reads
 * "2025-12-25" as the day before.
 * @param {string | null | undefined} isoString
 * @param {FormatDateOptions} [options]
 * @returns {string}
 */
export function formatDate(
  isoString,
  {
    includeYear = true,
    dayStyle = 'numeric',
    monthStyle = 'long',
    timeZone = 'UTC'
  } = {}
) {
  if (!isoString || Number.isNaN(new Date(isoString).getTime())) {
    return ''
  }

  /** @type {Intl.DateTimeFormatOptions} */
  const dateOptions = { day: dayStyle, month: monthStyle, timeZone }

  if (includeYear) {
    dateOptions.year = 'numeric'
  }

  return new Date(isoString).toLocaleDateString('en-GB', dateOptions)
}

/**
 * Format an ISO timestamp to a human-readable date with abbreviated month.
 * e.g. "2026-02-15T15:09:00.000Z" → "15 Feb 2026"
 * @param {string | null | undefined} isoString
 * @param {Omit<FormatDateOptions, 'monthStyle'>} [options]
 * @returns {string}
 */
export function formatDateShort(isoString, options = {}) {
  return formatDate(isoString, { ...options, monthStyle: 'short' })
}
