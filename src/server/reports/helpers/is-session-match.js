/**
 * Checks whether session data matches the given period coordinates.
 * Used by confirmation page controllers to guard against direct URL access.
 * @param {Record<string, unknown> | undefined} sessionData
 * @param {{ year: number, cadence: string, period: number }} duration
 * @returns {boolean}
 */
export function isSessionMatch(sessionData, duration) {
  return (
    !!sessionData &&
    sessionData.year === duration.year &&
    sessionData.cadence === duration.cadence &&
    sessionData.period === duration.period
  )
}
