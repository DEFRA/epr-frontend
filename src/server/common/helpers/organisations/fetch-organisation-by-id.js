import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import {Organisation} from '#domain/organisations/model.js' */

/**
 * Fetches organisation data by ID from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<Organisation>} Organisation data with accreditations and registrations
 */
async function fetchOrganisationById(organisationId, backendToken) {
  const path = `/v1/organisations/${organisationId}`

  return fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
}

export { fetchOrganisationById }
