import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

/**
 * @import { Boom } from '@hapi/boom'
 * @import { OrganisationById } from './types.js'
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 */

const REFUSED = Object.freeze([statusCodes.forbidden, statusCodes.notFound])

/**
 * A 403 or 404 means the user cannot see the record, which is the same as no
 * record.
 * @param {string} organisationId
 * @param {BackendToken} backendToken
 * @returns {Promise<OrganisationById | null>}
 */
export const findOrganisationById = async (organisationId, backendToken) => {
  try {
    return await fetchOrganisationById(organisationId, backendToken)
  } catch (error) {
    if (REFUSED.includes(/** @type {Boom} */ (error).output.statusCode)) {
      return null
    }

    throw error
  }
}
