/**
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 */

/**
 * @typedef {{
 *   awaitingAuthorisation: PackagingRecyclingNote[],
 *   awaitingCancellation: PackagingRecyclingNote[],
 *   issued: PackagingRecyclingNote[],
 *   cancelled: PackagingRecyclingNote[],
 *   mostRecent: PackagingRecyclingNote[],
 *   isEmpty: boolean
 * }} PrnGroups
 */

const MOST_RECENT_COUNT = 3

/**
 * The five statuses a regulator sees. A status absent here is not drawn.
 * @type {Record<string, keyof Omit<PrnGroups, 'mostRecent' | 'isEmpty'>>}
 */
const GROUP_BY_STATUS = {
  awaiting_authorisation: 'awaitingAuthorisation',
  awaiting_cancellation: 'awaitingCancellation',
  awaiting_acceptance: 'issued',
  accepted: 'issued',
  cancelled: 'cancelled'
}

/**
 * @param {string} timestamp
 * @returns {number}
 */
const at = (timestamp) => new Date(timestamp).getTime()

/**
 * @param {PackagingRecyclingNote} note
 * @returns {boolean}
 */
const isIssued = (note) => Boolean(note.issuedAt)

/**
 * Newest first by the date its table shows, unissued notes above issued ones.
 * @param {PackagingRecyclingNote} note
 * @param {PackagingRecyclingNote} other
 * @returns {number}
 */
const newestFirst = (note, other) => {
  if (isIssued(note) !== isIssued(other)) {
    return isIssued(note) ? 1 : -1
  }

  return note.issuedAt && other.issuedAt
    ? at(other.issuedAt) - at(note.issuedAt)
    : at(other.createdAt) - at(note.createdAt)
}

/**
 * Groups and orders an accreditation's notes for the two regulator pages.
 * `isEmpty` covers the five shown statuses, unlike `hasCreatedPrns`.
 * @param {PackagingRecyclingNote[]} notes
 * @returns {PrnGroups}
 */
export const toPrnGroups = (notes) => {
  /** @type {Omit<PrnGroups, 'mostRecent' | 'isEmpty'>} */
  const groups = {
    awaitingAuthorisation: [],
    awaitingCancellation: [],
    issued: [],
    cancelled: []
  }

  const shown = notes.filter((note) => {
    const group = GROUP_BY_STATUS[note.status]

    if (group) {
      groups[group].push(note)
    }

    return Boolean(group)
  })

  for (const group of Object.values(groups)) {
    group.sort(newestFirst)
  }

  return {
    ...groups,
    mostRecent: [...shown].sort(newestFirst).slice(0, MOST_RECENT_COUNT),
    isEmpty: shown.length === 0
  }
}
