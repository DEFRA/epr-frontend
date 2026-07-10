/**
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-note.js'
 * @import { PackagingRecyclingNote as PackagingRecyclingNoteListItem } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
 * @import { CreatePrnResponse } from '#server/prns/helpers/create-prn.js'
 * @import { UpdatePrnStatusResponse } from '#server/prns/helpers/update-prn-status.js'
 * @import { IssuedToOrganisation } from '#server/prns/helpers/fetch-packaging-recycling-note.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 */

/**
 * Casts a partial mock object to the `PackagingRecyclingNote` shape that
 * `fetchPackagingRecyclingNote` resolves.
 * @param {unknown} data
 * @returns {PackagingRecyclingNote}
 */
export const asPackagingRecyclingNote = (data) =>
  /** @type {PackagingRecyclingNote} */ (data)

/**
 * Casts an array of partial mock objects to the `PackagingRecyclingNote[]` shape
 * that `fetchPackagingRecyclingNotes` resolves.
 * @param {unknown} data
 * @returns {PackagingRecyclingNoteListItem[]}
 */
export const asPackagingRecyclingNotes = (data) =>
  /** @type {PackagingRecyclingNoteListItem[]} */ (data)

/**
 * Casts a partial mock object to the `CreatePrnResponse` shape that `createPrn`
 * resolves.
 * @param {unknown} data
 * @returns {CreatePrnResponse}
 */
export const asCreatePrnResponse = (data) =>
  /** @type {CreatePrnResponse} */ (data)

/**
 * Casts a partial mock object to the `UpdatePrnStatusResponse` shape that
 * `updatePrnStatus` resolves.
 * @param {unknown} data
 * @returns {UpdatePrnStatusResponse}
 */
export const asUpdatePrnStatusResponse = (data) =>
  /** @type {UpdatePrnStatusResponse} */ (data)

/**
 * Casts a partial mock object to the `IssuedToOrganisation` shape used on PRN
 * responses, so tests can supply only the fields the code path reads.
 * @param {unknown} data
 * @returns {IssuedToOrganisation}
 */
export const asIssuedToOrganisation = (data) =>
  /** @type {IssuedToOrganisation} */ (data)

/**
 * Casts a partial mock object to the `WasteBalance` shape that `getWasteBalance`
 * resolves.
 * @param {unknown} data
 * @returns {WasteBalance}
 */
export const asWasteBalance = (data) => /** @type {WasteBalance} */ (data)
