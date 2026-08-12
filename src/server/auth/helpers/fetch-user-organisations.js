import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

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
  const data = await fetchJsonFromBackend('/v1/me/organisations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })
  return data.organisations
}
