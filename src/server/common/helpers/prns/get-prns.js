import { fetchPrns } from './fetch-prns.js'

/**
 * Fetches PRNs for an accreditation with error handling
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} idToken - JWT ID token for authorization
 * @param {object} logger - Logger instance for error reporting
 * @returns {Promise<Array>} PRN items array (empty array on failure)
 */
async function getPrns(organisationId, accreditationId, idToken, logger) {
  try {
    const response = await fetchPrns(organisationId, accreditationId, idToken)
    return response.items ?? []
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch PRNs')
    return []
  }
}

export { getPrns }
