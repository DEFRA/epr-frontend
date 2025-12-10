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
 * @import { Logger } from 'pino'
 */

/**
 * Fetches user's organisations from EPR Backend
 * @param {object} [options]
 * @param {Logger} [options.logger] - Optional logger for error logging
 * @returns {(accessToken: string) => Promise<{organisations: UserOrganisations}>}
 */
const fetchUserOrganisations = (options = {}) => {
  const url = `${config.get('eprBackendUrl')}/v1/me/organisations`
  const { logger } = options

  /**
   * Fetches user's organisations from EPR Backend
   * @param {string} accessToken
   * @returns {Promise<{organisations: UserOrganisations}>}
   */
  return async (accessToken) => {
    try {
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
    } catch (error) {
      if (logger) {
        logger.error(
          { error },
          'Failed to fetch user organisations during authentication'
        )
      }
      throw error
    }
  }
}

export { fetchUserOrganisations }
