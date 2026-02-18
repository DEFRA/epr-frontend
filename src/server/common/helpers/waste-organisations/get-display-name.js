/** @import {WasteOrganisation} from './types.js' */

/**
 * Gets the display name for an organisation.
 *
 * When year is provided and the organisation has registrations, only
 * registrations for that year are considered for type-aware logic:
 * compliance schemes show tradingName, producers show name.
 *
 * When registrations are absent or none match the year, falls back to
 * preferring tradingName over name.
 * @param {Pick<WasteOrganisation, 'name' | 'tradingName'> & { registrations?: WasteOrganisation['registrations'] }} organisation
 * @param {number} [year]
 * @returns {string}
 */
export const getDisplayName = (organisation, year) => {
  const registrations = year
    ? organisation.registrations?.filter(
        (r) => Number(r.registrationYear) === year
      )
    : organisation.registrations

  if (registrations?.length) {
    const isComplianceScheme = registrations.some(
      (r) => r.type === 'COMPLIANCE_SCHEME'
    )
    return isComplianceScheme
      ? organisation.tradingName || organisation.name
      : organisation.name
  }

  return organisation.tradingName || organisation.name
}
