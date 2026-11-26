import { prnStatuses } from '#server/common/constants/statuses.js'

/**
 * @import { PrnStatus } from '#server/common/constants/statuses.js'
 * @import { PackagingRecyclingNote } from './prn-resource.js'
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
 * @type {Partial<Record<PrnStatus, keyof Omit<PrnGroups, 'mostRecent' | 'isEmpty'>>>}
 */
const GROUP_BY_STATUS = {
  [prnStatuses.awaitingAuthorisation]: 'awaitingAuthorisation',
  [prnStatuses.awaitingCancellation]: 'awaitingCancellation',
  [prnStatuses.awaitingAcceptance]: 'issued',
  [prnStatuses.accepted]: 'issued',
  [prnStatuses.cancelled]: 'cancelled'
}

/**
 * The date a note is read by: when it was issued, or where it has not been,
 * when it was made. The summary table shows this one, so it orders by it.
 * @param {PackagingRecyclingNote} note
 * @returns {number}
 */
const shownDate = (note) => new Date(note.issuedAt ?? note.createdAt).getTime()

/**
 * @param {PackagingRecyclingNote} note
 * @param {PackagingRecyclingNote} other
 * @returns {number}
 */
const newestFirst = (note, other) => shownDate(other) - shownDate(note)

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

  // The groups keep the order the backend answered in — the tables are read
  // whole, and reordering them would change the operator's list too. Only the
  // summary section, which shows three of them, needs an order of its own.
  return {
    ...groups,
    mostRecent: [...shown].sort(newestFirst).slice(0, MOST_RECENT_COUNT),
    isEmpty: shown.length === 0
  }
}
