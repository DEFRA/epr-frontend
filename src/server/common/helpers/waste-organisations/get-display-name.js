/** @import {WasteOrganisation} from './types.js' */

/**
 * Gets the display name for an organisation.
 *
 * When the organisation has registrations (full WasteOrganisation from the API),
 * uses type-aware logic: compliance schemes show tradingName, producers show name.
 *
 * When registrations are absent (e.g. PRN data or companyDetails), falls back to
 * preferring tradingName over name for backward compatibility.
 * @param {Pick<WasteOrganisation, 'name' | 'tradingName'> & { registrations?: WasteOrganisation['registrations'] }} organisation
 * @returns {string}
 */
export const getDisplayName = (organisation) => {
  if (organisation.registrations?.length) {
    const isComplianceScheme = organisation.registrations.some(
      (r) => r.type === 'COMPLIANCE_SCHEME'
    )
    return isComplianceScheme
      ? organisation.tradingName || organisation.name
      : organisation.name
  }

  return organisation.tradingName || organisation.name
}
