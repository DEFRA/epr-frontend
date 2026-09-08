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
 * Which group draws a note, by its status. The five here are the ones a
 * regulator sees, split as the operator's own list splits them.
 *
 * `draft` and `discarded` are absent on purpose, and so is any status a later
 * release adds: a note this map has no entry for is not drawn, rather than
 * drawn under a heading it does not belong to. `deleted` never arrives — the
 * backend's query excludes it.
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
 * Takes a timestamp rather than a nullable one: by the time `newestFirst`
 * calls this, it has already established which of the two dates it is
 * comparing, and neither can be absent.
 * @param {string} timestamp
 * @returns {number}
 */
const at = (timestamp) => new Date(timestamp).getTime()

/**
 * A note is issued once it has a date of issue. Named rather than negated
 * inline, so the comparison below reads as the question it asks.
 * @param {PackagingRecyclingNote} note
 * @returns {boolean}
 */
const isIssued = (note) => Boolean(note.issuedAt)

/**
 * Newest first, with everything still awaiting issue above everything already
 * issued.
 *
 * The tables are headed by a date, so the rows are ordered by the date they
 * show: sorting on one a reader cannot see leaves them in an order nobody can
 * account for. A note awaiting issue has no issue date, so it is ordered by
 * when it was created and floated to the top — which is both what the design
 * draws and what a regulator opens the page to find out, namely what is
 * outstanding.
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
 * The notes of one accreditation, grouped as the two regulator pages draw them
 * and ordered within each group.
 *
 * Emptiness is answered here rather than left to the caller. The operator's
 * list asks `prns.some((prn) => prn.status !== 'draft')`, which is a different
 * question: an accreditation holding nothing but discarded notes passes it and
 * would then render four empty tables.
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
