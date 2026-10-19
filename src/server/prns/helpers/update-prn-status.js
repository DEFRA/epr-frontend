import { backend } from '#server/common/helpers/backend-client.js'
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
const updatePrnStatus = async (keys, prnId, payload, backendToken) => {
  /** @type {PrnResource} */
  const note = await backend(backendToken).post(
    `${prnsPath(keys)}/${encodeURIComponent(prnId)}/status`,
    payload
  )

  return toPackagingRecyclingNote(note)
}

export { updatePrnStatus }

/**
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { PackagingRecyclingNote, PrnResource } from './prn-resource.js'
 */
