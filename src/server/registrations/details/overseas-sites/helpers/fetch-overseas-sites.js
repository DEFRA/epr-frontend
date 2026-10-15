import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'

/**
 * @typedef {{
 *   name: string,
 *   address: {
 *     country: string,
 *     line1: string,
 *     line2?: string,
 *     townOrCity: string,
 *     stateOrRegion?: string,
 *     postcode?: string
 *   },
 *   coordinates?: string
 * }} OverseasSiteView
 */

/**
 * @typedef {Record<string, OverseasSiteView>} OverseasSitesByOrsId
 * @typedef {{
 *   material: string,
 *   overseasSites?: OverseasSitesByOrsId
 * }} RegistrationView
 * @typedef {{
 *   name: string,
 *   tradingName?: string,
 *   organisationNumber: number,
 *   registrations: Record<string, RegistrationView>
 * }} OrganisationView
 * @typedef {{
 *   organisation: OrganisationView,
 *   registrationNumber: string,
 *   registration: RegistrationView
 * }} OverseasSitesDetails
 * @typedef {{
 *   organisationNumber: string,
 *   registrationNumber: string,
 *   backendToken: string
 * }} OverseasSitesRequest
 */

/**
 * @param {OverseasSitesRequest} params
 * @returns {Promise<OverseasSitesDetails>}
 */
export const fetchOverseasSites = async (params) => {
  const { organisation, registration } = await fetchRegistration(params)

  return {
    organisation,
    registrationNumber: params.registrationNumber,
    registration
  }
}
