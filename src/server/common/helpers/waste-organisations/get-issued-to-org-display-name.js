/**
 * Gets the display name for an issued-to organisation (producer/compliance scheme).
 *
 * Compliance schemes show tradingName (the scheme name), large producers
 * show name (the legal/registered name). When registrationType is absent,
 * falls back to preferring tradingName over name.
 * @param {Pick<import('./types.js').WasteOrganisation, 'name' | 'tradingName'> & { registrationType?: string }} organisation
 * @returns {string}
 */
export const getIssuedToOrgDisplayName = (organisation) => {
  if (organisation.registrationType === 'COMPLIANCE_SCHEME') {
    return organisation.tradingName || organisation.name
  }

  if (organisation.registrationType) {
    return organisation.name
  }

  return organisation.tradingName || organisation.name
}
