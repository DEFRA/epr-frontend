/**
 * @typedef {{
 *  addressLine1: ?string
 *  addressLine2: ?string
 *  town: ?string
 *  county: ?string
 *  postcode: ?string
 *  country: ?string
 * }} WasteOrganisationAddress
 */

/**
 * @typedef {'REGISTERED' | 'CANCELLED'} WasteOrganisationStatus
 */

/**
 * @typedef {'SMALL_PRODUCER' | 'LARGE_PRODUCER' | 'COMPLIANCE_SCHEME' | 'REPROCESSOR' | 'EXPORTER' } WasteOrganisationType
 */

/**
 * @typedef {{
 *  status: WasteOrganisationStatus
 *  type: WasteOrganisationType
 *  registrationYear: number | string
 * }} WasteOrganisationRegistrations
 */

/**
 * @typedef {{
 *  id: string
 *  name: string
 *  tradingName: ?string
 *  businessCountry: ?string
 *  companiesHouseNumber: ?string
 *  address: WasteOrganisationAddress
 *  registrations: WasteOrganisationRegistrations[]
 * }} WasteOrganisation
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
