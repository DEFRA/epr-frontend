import { fetchPrn } from './fetch-prn.js'

/**
 * Fetches a PRN for an accreditation with error handling
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnNumber - The prn number
 * @param {object} logger - Logger instance for error reporting
 * @returns {Promise<object|null>} PRN data or null if not found/on failure
 */
async function getPrn(
  organisationId,
  accreditationId,
  prnNumber,
  // idToken,
  logger
) {
  try {
    return await fetchPrn(
      organisationId,
      accreditationId,
      prnNumber
      // , idToken
    )
  } catch (error) {
    logger.warn({ error }, `Failed to fetch PRN ${prnNumber}`)
    return null
  }
}

export { getPrn }
