import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { prnsPath, toPackagingRecyclingNote } from './prn-resource.js'

/**
 * @typedef {object} UpdatePrnStatusPayload
 * @property {string} status - The new status (e.g. 'awaiting_authorisation')
 */

/**
 * Updates the status of a PRN/PERN via the backend API
 * @param {AccreditationKeys} keys
 * @param {string} prnId - The PRN ID
 * @param {UpdatePrnStatusPayload} payload - Status update data
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<PackagingRecyclingNote>}
 */
async function updatePrnStatus(keys, prnId, payload, backendToken) {
  const path = `${prnsPath(keys)}/${encodeURIComponent(prnId)}/status`

  return toPackagingRecyclingNote(
    /** @type {PrnResource} */ (
      await fetchJsonFromBackend(path, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${backendToken}`
        },
        body: JSON.stringify(payload)
      })
    )
  )
}

export { updatePrnStatus }

/**
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { PackagingRecyclingNote, PrnResource } from './prn-resource.js'
 */
