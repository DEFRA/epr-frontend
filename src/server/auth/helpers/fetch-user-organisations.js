import { backend } from '#server/common/helpers/backend-client.js'

/**
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 * @import { UserOrganisations } from '../types/organisations.js'
 * @import { UserSession } from '../types/session.js'
 */

/**
 * Fetches user organisations from the backend API
 * @param {BackendToken} backendToken
 * @returns {Promise<UserOrganisations>}
 */
export async function fetchUserOrganisations(backendToken) {
  /** @type {{ organisations: UserOrganisations }} */
  const { organisations } = await backend(backendToken).get(
    '/v1/me/organisations'
  )
  return organisations
}
