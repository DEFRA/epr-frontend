import { accreditationPath } from '#server/reports/helpers/report-paths.js'

/**
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {object} IssuedToOrganisation
 * @property {string} id
 * @property {string} name
 * @property {string | null} [tradingName]
 * @property {string} [registrationType]
 */

/**
 * A PRN as the backend serves it under its accreditation.
 * @typedef {{
 *   id: string,
 *   prnNumber?: string,
 *   status: string,
 *   issuedToOrganisation: IssuedToOrganisation,
 *   accreditation: {
 *     accreditationNumber: string,
 *     accreditationYear: number,
 *     wasteProcessingType: string,
 *     material: string
 *   },
 *   tonnage: number,
 *   processToBeUsed: string,
 *   isDecemberWaste: boolean,
 *   obligationYear: number,
 *   notes?: string,
 *   createdAt: string,
 *   issued?: { at: string, by: { name?: string, position?: string } }
 * }} PrnResource
 */

/**
 * A PRN as the pages read it.
 * @typedef {{
 *   id: string,
 *   prnNumber: string | null,
 *   issuedToOrganisation: IssuedToOrganisation,
 *   tonnage: number,
 *   material: string,
 *   status: string,
 *   createdAt: string,
 *   notes: string | null,
 *   isDecemberWaste: boolean,
 *   wasteProcessingType: string,
 *   processToBeUsed: string,
 *   accreditationYear: number,
 *   issuedAt: string | null,
 *   issuedBy: { name?: string, position?: string } | null
 * }} PackagingRecyclingNote
 */

/**
 * The accreditation's PRN collection, the same address for page and backend.
 * @param {AccreditationKeys} keys
 * @returns {string}
 */
export const prnsPath = (keys) =>
  `${accreditationPath(keys)}/packaging-recycling-notes`

/**
 * @param {PrnResource} prn
 * @returns {PackagingRecyclingNote}
 */
export const toPackagingRecyclingNote = (prn) => ({
  id: prn.id,
  prnNumber: prn.prnNumber ?? null,
  issuedToOrganisation: prn.issuedToOrganisation,
  tonnage: prn.tonnage,
  material: prn.accreditation.material,
  status: prn.status,
  createdAt: prn.createdAt,
  notes: prn.notes ?? null,
  isDecemberWaste: prn.isDecemberWaste,
  wasteProcessingType: prn.accreditation.wasteProcessingType,
  processToBeUsed: prn.processToBeUsed,
  accreditationYear: prn.accreditation.accreditationYear,
  issuedAt: prn.issued?.at ?? null,
  issuedBy: prn.issued?.by ?? null
})
