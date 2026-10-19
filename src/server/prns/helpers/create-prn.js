import { backend } from '#server/common/helpers/backend-client.js'
import { prnsPath, toPackagingRecyclingNote } from './prn-resource.js'

/**
 * @typedef {object} CreatePrnPayload
 * @property {IssuedToOrganisation} issuedToOrganisation - The recipient organisation
 * @property {number} tonnage - Tonnage amount (whole number)
 * @property {string} [notes] - Optional notes from issuer
 * @property {boolean} [isDecemberWaste] - Whether this PRN relates to December waste
 */

/**
 * Creates a new PRN/PERN via the backend API
 * @param {AccreditationKeys} keys
 * @param {CreatePrnPayload} payload - PRN creation data
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<PackagingRecyclingNote>}
 */
const createPrn = async (keys, payload, backendToken) =>
  toPackagingRecyclingNote(
    /** @type {PrnResource} */ (
      await backend(backendToken).post(prnsPath(keys), payload)
    )
  )

export { createPrn }

/**
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { IssuedToOrganisation, PackagingRecyclingNote, PrnResource } from './prn-resource.js'
 */
