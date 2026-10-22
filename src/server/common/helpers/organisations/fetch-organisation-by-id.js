import { backend, path } from '#server/common/helpers/backend-client.js'

/** @import { BackendToken } from '#server/common/helpers/backend-token.js' */
/** @import { OrganisationById } from '#server/common/helpers/natural-keys/types.js' */

/**
 * Fetches organisation data by ID from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {BackendToken} backendToken
 * @returns {Promise<OrganisationById>}
 */
const fetchOrganisationById = (organisationId, backendToken) =>
  backend(backendToken).get(path`/v1/organisations/${organisationId}`)

export { fetchOrganisationById }
