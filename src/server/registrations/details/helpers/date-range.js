import { formatDate } from '#server/common/helpers/format-date.js'

/**
 * @import { DateRange } from './types.js'
 */

/**
 * The period a record is valid over, as a reader sees it. A record that has
 * not started names no period at all; one that has started and has no end is
 * current. Shared by the registration and accreditation pages so a period
 * reads the same wherever it appears.
 * @param {DateRange} dateRange
 * @param {(key: string) => string} localise
 * @returns {string}
 */
export const toDateRange = ({ validFrom, validTo }, localise) => {
  if (!validFrom) {
    return ''
  }

  const from = formatDate(validFrom)
  const to = validTo
    ? formatDate(validTo)
    : localise('registrations:details:current')

  return `${from} - ${to}`
}
