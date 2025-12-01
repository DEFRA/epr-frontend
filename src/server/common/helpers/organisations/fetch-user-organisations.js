import { config } from '#config/config.js'
import fetch from 'node-fetch'

/**
 * @typedef {{
 *   id: string,
 *   orgId: string,
 *   linkedDefraOrganisation?: object,
 *   users: Array<object>
 * }} Organisation
 */

/**
 * @typedef {{
 *   linked: Organisation[],
 *   unlinked: Organisation[],
 * }} UserOrganisations
 */

/**
 * Fetches user's organisations from EPR Backend
 * @param {boolean} isLocal
 * @returns {(string: accessToken) => Promise<{organisations: UserOrganisations}>}
 */
const fetchUserOrganisations = (isLocal) => {
  // TODO this is temporary whilst we use our own endpoint
  const url = isLocal
    ? `${config.get('appBaseUrl')}/me/organisations`
    : `${config.get('eprBackendUrl')}/v1/me/organisations`

  /**
   * Fetches user's organisations from EPR Backend
   * @param {string} accessToken
   * @returns {Promise<{organisations: UserOrganisations}>}
   */
  return async (accessToken) => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error = new Error(
        `Backend returned ${response.status}: ${response.statusText}`
      )
      error.status = response.status
      throw error
    }

    return response.json()
  }
}

export { fetchUserOrganisations }
