/**
 * Gets the display name for an issuing organisation (reprocessor/exporter).
 * Always prefers tradingName over name.
 * @param {Pick<import('./types.js').WasteOrganisation, 'name' | 'tradingName'>} organisation
 * @returns {string}
 */
export const getIssuingOrgDisplayName = (organisation) =>
  organisation.tradingName || organisation.name
