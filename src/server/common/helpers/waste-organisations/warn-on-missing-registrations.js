import { getYear } from 'date-fns'

const PRODUCER_TYPES = new Set(['LARGE_PRODUCER', 'COMPLIANCE_SCHEME'])

/**
 * Logs a warning for any waste organisation that lacks a current-year
 * producer registration, meaning we cannot confidently determine
 * the correct display name.
 * @param {Array<{ id: string, name: string, registrations?: Array<{ type: string, registrationYear: number | string }> }>} organisations
 * @param {{ warn: (data: object, message: string) => void }} logger
 */
export const warnOnMissingRegistrations = (organisations, logger) => {
  const currentYear = getYear(new Date())

  for (const org of organisations) {
    const currentYearProducerRegs = org.registrations?.filter(
      (r) =>
        PRODUCER_TYPES.has(r.type) && Number(r.registrationYear) === currentYear
    )

    if (!currentYearProducerRegs?.length) {
      logger.warn(
        { organisationId: org.id, organisationName: org.name },
        'Waste organisation has no current-year registration as LARGE_PRODUCER or COMPLIANCE_SCHEME — display name will fall back to tradingName preference'
      )
      continue
    }

    const types = new Set(currentYearProducerRegs.map((r) => r.type))
    if (types.size > 1) {
      logger.warn(
        { organisationId: org.id, organisationName: org.name },
        'Waste organisation has both LARGE_PRODUCER and COMPLIANCE_SCHEME registrations for the current year — likely bad data from RPD'
      )
    }
  }
}
