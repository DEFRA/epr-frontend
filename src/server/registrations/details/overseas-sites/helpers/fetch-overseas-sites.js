import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'

/**
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

/**
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
