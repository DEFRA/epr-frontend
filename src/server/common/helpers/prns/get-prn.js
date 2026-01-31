import { fetchPrn } from './fetch-prn.js'

/**
 * Fetches PRNs for an accreditation with error handling
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnNumber - The prn number
 * @param {object} logger - Logger instance for error reporting
 * @returns {Promise<Array>} PRN items array (empty array on failure)
 */
async function getPrn(
  organisationId,
  accreditationId,
  prnNumber,
  // idToken,
  logger
) {
  try {
    const response = await fetchPrn(
      organisationId,
      accreditationId,
      prnNumber
      // , idToken
    )
    return response
  } catch (error) {
    logger.warn({ error }, `Failed to fetch PRN ${prnNumber}`)
    return null
  }
}

export { getPrn }
