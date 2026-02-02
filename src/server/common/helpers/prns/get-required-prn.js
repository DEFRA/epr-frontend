import Boom from '@hapi/boom'
import { getPrn } from './get-prn.js'

/**
 * Fetches a PRN for an accreditation, throwing 404 if not found.
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnId - The PRN ID
 * @param {object} logger - Logger instance for error reporting
 * @returns {Promise<object>} PRN data
 * @throws {Boom.notFound} When PRN is not found
 */
async function getRequiredPrn(organisationId, accreditationId, prnId, logger) {
  const prn = await getPrn(organisationId, accreditationId, prnId, logger)

  if (!prn) {
    logger.warn({ prnId }, `PRN ${prnId} not found`)
    throw Boom.notFound(`PRN ${prnId} not found`)
  }

  return prn
}

export { getRequiredPrn }
