import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/**
 * @import { Request } from '@hapi/hapi'
 * @import { UserOrganisations } from '../types/organisations.js'
 */

/**
 * Fetches user organisations from the backend API
 * @param {Request} request - Hapi request object
 * @param {object} [options]
 * @param {string} [options.idToken] - Override token (used during auth callback before session is set)
 * @returns {Promise<UserOrganisations>}
 */
export async function fetchUserOrganisations(request, options = {}) {
  const headers = options.idToken
    ? { Authorization: `Bearer ${options.idToken}` }
    : undefined

  /** @type {{ organisations: UserOrganisations }} */
  const data = await fetchJsonFromBackend(request, '/v1/me/organisations', {
    method: 'GET',
    headers
  })
  return data.organisations
}
