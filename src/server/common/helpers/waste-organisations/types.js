/** @import {Year} from '#server/common/helpers/year.js' */

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

export const WASTE_ORGANISATION_STATUS = Object.freeze(
  /** @type {const} */ ({ registered: 'REGISTERED', cancelled: 'CANCELLED' })
)

/**
 * @typedef {(typeof WASTE_ORGANISATION_STATUS)[keyof typeof WASTE_ORGANISATION_STATUS]} WasteOrganisationStatus
 */

/**
 * @typedef {'SMALL_PRODUCER' | 'LARGE_PRODUCER' | 'COMPLIANCE_SCHEME' | 'REPROCESSOR' | 'EXPORTER' } WasteOrganisationType
 */

/**
 * Simplified waste organisation with extracted registrationType.
 * The API adapter extracts registrationType from the raw registrations
 * array and removes it. registrationYears are the requested years the
 * organisation holds a producer registration for, and registrationType comes
 * from the first of them; it is absent when there is none.
 * @typedef {{
 *  id: string
 *  name: string
 *  tradingName: string | null
 *  businessCountry: BusinessCountry | null
 *  companiesHouseNumber: string | null
 *  address: WasteOrganisationAddress
 *  registrationType?: WasteOrganisationType
 *  registrationYears: Year[]
 * }} WasteOrganisation
 */
