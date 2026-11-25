import { formatDate } from '#server/common/helpers/format-date.js'

/**
 * @import { DateRange, Localise } from './types.js'
 */

/**
 * The period an accreditation covers within its year, as a reader sees it,
 * naming the year once at the end. One with no accredited day names no period.
 * Shared by the registration and accreditation pages so a period reads the
 * same wherever it appears.
 * @param {DateRange} dateRange
 * @param {Localise} localise
 * @returns {string}
 */
export const toDateRange = ({ validFrom, validTo }, localise) =>
  validFrom && validTo
    ? localise('registrations:details:period', {
        from: formatDate(validFrom, { includeYear: false }),
        to: formatDate(validTo)
      })
    : ''
