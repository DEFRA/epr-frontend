import { getIssuedToOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issued-to-org-display-name.js'

import { toPrnGroups } from './prn-groups.js'

/**
 * @import { PackagingRecyclingNote } from './fetch-packaging-recycling-notes.js'
 */

/**
 * A note in a table awaiting somebody, which carries no number yet.
 * @param {PackagingRecyclingNote} prn
 */
const toAwaitingRow = (prn) => ({
  id: prn.id,
  recipient: getIssuedToOrgDisplayName(prn.issuedToOrganisation),
  createdAt: prn.createdAt,
  tonnage: prn.tonnage,
  status: prn.status,
  isDecemberWaste: prn.isDecemberWaste
})

/**
 * A note in a table that names its number and the date it was issued.
 * @param {PackagingRecyclingNote} prn
 */
const toDetailRow = (prn) => ({
  id: prn.id,
  prnNumber: prn.prnNumber,
  recipient: getIssuedToOrgDisplayName(prn.issuedToOrganisation),
  issuedAt: prn.issuedAt,
  tonnage: prn.tonnage,
  status: prn.status,
  isDecemberWaste: prn.isDecemberWaste
})

/**
 * The four sets of rows the note tables draw, shared by the operator's list
 * and the regulator's, so both partition and render a note the same way.
 * @param {PackagingRecyclingNote[]} notes
 */
export const toNoteRows = (notes) => {
  const groups = toPrnGroups(notes)

  return {
    prns: groups.awaitingAuthorisation.map(toAwaitingRow),
    cancellationPrns: groups.awaitingCancellation.map(toAwaitingRow),
    issuedPrns: groups.issued.map(toDetailRow),
    cancelledPrns: groups.cancelled.map(toDetailRow),
    hasCreatedPrns: notes.some((prn) => prn.status !== 'draft')
  }
}
