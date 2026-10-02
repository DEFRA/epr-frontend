import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { RegistrationResource } from './registration-resource.js' */

/**
 * Reads every registration an organisation holds, whatever its status, in the
 * order the collection documents.
 * @param {string} organisationId
 * @param {string} backendToken
 * @returns {Promise<RegistrationResource[]>}
 */
export const fetchOrganisationRegistrations = async (
  organisationId,
  backendToken
) => {
  const { registrations } =
    /** @type {{ registrations: RegistrationResource[] }} */ (
      await fetchJsonFromBackend(
        `/v1/organisations/${encodeURIComponent(organisationId)}/registrations`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${backendToken}`
          }
        }
      )
    )

  return registrations
}
