/**
 * Gets the display name for an issuing organisation (reprocessor/exporter).
 * Always prefers tradingName over name.
 *
 * `tradingName` is `?: string | null` so the same helper accepts both the
 * backend's nullable `WasteOrganisation` shape and the PRN response's
 * optional companyDetails shape. The `|| name` fallback handles both.
 * @param {{ name: string, tradingName?: string | null }} organisation
 * @returns {string}
 */
export const getIssuingOrgDisplayName = (organisation) =>
  organisation.tradingName || organisation.name
