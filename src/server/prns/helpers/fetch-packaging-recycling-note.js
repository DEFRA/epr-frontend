import { backend } from '#server/common/helpers/backend-client.js'
import { prnsPath, toPackagingRecyclingNote } from './prn-resource.js'

/**
 * Fetches a single packaging recycling note by ID from EPR Backend
 * @param {AccreditationKeys} keys
 * @param {string} prnId - The PRN ID
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<PackagingRecyclingNote>} The packaging recycling note
 */
const fetchPackagingRecyclingNote = async (keys, prnId, backendToken) =>
  toPackagingRecyclingNote(
    /** @type {PrnResource} */ (
      await backend(backendToken).get(
        `${prnsPath(keys)}/${encodeURIComponent(prnId)}`
      )
    )
  )

export { fetchPackagingRecyclingNote }

/**
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { PackagingRecyclingNote, PrnResource } from './prn-resource.js'
 */
