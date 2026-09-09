import { formatDate } from '#server/common/helpers/format-date.js'

/**
 * @import { DateRange, Localise } from './types.js'
 */

/**
 * The period a record is valid over, as a reader sees it. A record that has
 * not started names no period at all; one that has started and has no end is
 * current. A period inside one year names that year once, at the end; one that
 * crosses a year names both. Shared by the registration and accreditation
 * pages so a period reads the same wherever it appears.
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

  const crossesAYear =
    new Date(validFrom).getUTCFullYear() !== new Date(validTo).getUTCFullYear()

  return localise('registrations:details:period', {
    from: formatDate(validFrom, { includeYear: crossesAYear }),
    to: formatDate(validTo)
  })
}
