/**
 * @typedef {'GB-ENG' | 'GB-NIR' | 'GB-SCT' | 'GB-WLS'} BusinessCountry
 */

/**
 * @typedef {{
 *  addressLine1: string | null
 *  addressLine2: string | null
 *  town: string | null
 *  county: string | null
 *  postcode: string | null
 *  country: string | null
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
 *  tradingName: string | null
 *  businessCountry: BusinessCountry | null
 *  companiesHouseNumber: string | null
 *  address: WasteOrganisationAddress
 *  registrations: WasteOrganisationRegistrations[]
 * }} WasteOrganisation
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
