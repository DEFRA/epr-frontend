import { backend } from '#server/common/helpers/backend-client.js'

/**
 * @import { UserSession } from '../types/session.js'
 * @import { UserOrganisations } from '../types/organisations.js'
 */

/**
 * Fetches user organisations from the backend API
 * @param {string} backendToken
 * @returns {Promise<UserOrganisations>}
 */
export async function fetchUserOrganisations(backendToken) {
  /** @type {{ organisations: UserOrganisations }} */
  const { organisations } = await backend(backendToken).get(
    '/v1/me/organisations'
  )
  return organisations
}
