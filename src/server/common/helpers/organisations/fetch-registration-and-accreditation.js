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
 * @typedef {object} RegistrationWithAccreditation
 * @property {object} [organisationData] - The full organisation data
 * @property {object} [registration] - The found registration, if any
 * @property {object} [accreditation] - The linked accreditation, if any
 */
