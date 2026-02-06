import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

/**
 * Fetches organisation data and extracts the registration and its linked accreditation
 * @param {string} organisationId - The organisation ID
 * @param {string} registrationId - The registration ID to find
 * @param {string} idToken - JWT ID token for authorization
 * @returns {Promise<RegistrationWithAccreditation>} Organisation data with registration and accreditation
 */
async function fetchRegistrationAndAccreditation(
  organisationId,
  registrationId,
  idToken
) {
  const organisationData = await fetchOrganisationById(organisationId, idToken)

  const registration = organisationData?.registrations?.find(
    ({ id }) => id === registrationId
  )

  const accreditation = registration?.accreditationId
    ? organisationData?.accreditations?.find(
        ({ id }) => id === registration.accreditationId
      )
    : undefined

  return {
    organisationData,
    registration,
    accreditation
  }
}

export { fetchRegistrationAndAccreditation }

/**
 * @typedef {{
 *   id: string,
 *   orgId: number,
 *   companyDetails: {
 *     name: string,
 *     tradingName?: string,
 *     companiesHouseNumber?: string,
 *     registeredAddress?: {
 *       line1: string,
 *       town: string,
 *       postcode: string
 *     }
 *   },
 *   registrations?: Registration[],
 *   accreditations?: Accreditation[]
 * }} OrganisationData
 */

/**
 * @typedef {{
 *   id: string,
 *   wasteProcessingType: string,
 *   material: string,
 *   nation: string,
 *   accreditationId?: string,
 *   registrationNumber?: string,
 *   status?: string,
 *   site?: {
 *     address: {
 *       line1: string,
 *       town: string,
 *       postcode: string
 *     }
 *   }
 * }} Registration
 */

/**
 * @typedef {{
 *   id: string,
 *   status: string,
 *   accreditationNumber?: string
 * }} Accreditation
 */

/**
 * @typedef {{
 *   organisationData?: OrganisationData,
 *   registration?: Registration,
 *   accreditation?: Accreditation
 * }} RegistrationWithAccreditation
 */
