import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { prnsPath, toPackagingRecyclingNote } from './prn-resource.js'

/**
 * Fetches packaging recycling notes for an accreditation from EPR Backend
 * @param {AccreditationKeys} keys
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<PackagingRecyclingNote[]>} List of packaging recycling notes
 */
async function fetchPackagingRecyclingNotes(keys, backendToken) {
  const { items } = /** @type {{ items: PrnResource[] }} */ (
    await fetchJsonFromBackend(prnsPath(keys), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backendToken}`
      }
    })
  )

  // The backend lists newest first; the pages show notes in the order raised.
  return items.map(toPackagingRecyclingNote).sort(oldestFirst)
}

/**
 * @param {PackagingRecyclingNote} note
 * @param {PackagingRecyclingNote} other
 * @returns {number}
 */
const oldestFirst = (note, other) =>
  new Date(note.createdAt).getTime() - new Date(other.createdAt).getTime()

export { fetchPackagingRecyclingNotes }

/**
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { PackagingRecyclingNote, PrnResource } from './prn-resource.js'
 */
