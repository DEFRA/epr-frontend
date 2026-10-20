import { backend, path } from '#server/common/helpers/backend-client.js'

/** @import {Organisation} from '#domain/organisations/model.js' */

/**
 * Fetches organisation data by ID from EPR Backend
 * @param {string} organisationId - The organisation ID
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<Organisation>} Organisation data with accreditations and registrations
 */
const fetchOrganisationById = (organisationId, backendToken) =>
  backend(backendToken).get(path`/v1/organisations/${organisationId}`)

export { fetchOrganisationById }
