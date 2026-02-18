/**
 * Logs a warning for any waste organisation missing registrations.
 * @param {Array<{ id: string, name: string, registrations?: unknown[] }>} organisations
 * @param {{ warn: (data: object, message: string) => void }} logger
 */
export const warnOnMissingRegistrations = (organisations, logger) => {
  for (const org of organisations) {
    if (!org.registrations?.length) {
      logger.warn(
        { organisationId: org.id, organisationName: org.name },
        'Waste organisation has no registrations — display name will fall back to tradingName preference'
      )
    }
  }
}
