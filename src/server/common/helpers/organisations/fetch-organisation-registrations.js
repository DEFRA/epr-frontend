import { backend, path } from '#server/common/helpers/backend-client.js'

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
  /** @type {{ registrations: RegistrationResource[] }} */
  const { registrations } = await backend(backendToken).get(
    path`/v1/organisations/${organisationId}/registrations`
  )

  return registrations
}
