import { formatDate } from '#server/common/helpers/format-date.js'

/**
 * @import { DateRange } from './types.js'
 */

/**
 * @typedef {(key: string, options?: Record<string, string>) => string} Localise
 */

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
const inSameYear = (from, to) =>
  new Date(from).getUTCFullYear() === new Date(to).getUTCFullYear()

/**
 * The period a record is valid over, as a reader sees it. A record that has
 * not started names no period at all; one that has started and has no end is
 * current. A period that starts and ends in one year names that year once, at
 * the end. Shared by the registration and accreditation pages so a period
 * reads the same wherever it appears.
 * @param {DateRange} dateRange
 * @param {Localise} localise
 * @returns {string}
 */
export const toDateRange = ({ validFrom, validTo }, localise) => {
  if (!validFrom) {
    return ''
  }

  if (!validTo) {
    return localise('registrations:details:period', {
      from: formatDate(validFrom),
      to: localise('registrations:details:current')
    })
  }

  return localise('registrations:details:period', {
    from: formatDate(validFrom, {
      includeYear: !inSameYear(validFrom, validTo)
    }),
    to: formatDate(validTo)
  })
}
