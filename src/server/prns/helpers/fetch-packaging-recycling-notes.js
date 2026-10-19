import { backend } from '#server/common/helpers/backend-client.js'
import { prnsPath, toPackagingRecyclingNote } from './prn-resource.js'

/**
 * Fetches packaging recycling notes for an accreditation from EPR Backend
 * @param {AccreditationKeys} keys
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<PackagingRecyclingNote[]>} List of packaging recycling notes
 */
const fetchPackagingRecyclingNotes = async (keys, backendToken) => {
  /** @type {{ items: PrnResource[] }} */
  const { items } = await backend(backendToken).get(prnsPath(keys))

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
