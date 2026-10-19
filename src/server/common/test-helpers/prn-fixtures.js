/**
 * @import { IssuedToOrganisation, PackagingRecyclingNote, PrnResource } from '#server/prns/helpers/prn-resource.js'
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
 * @returns {PackagingRecyclingNote[]}
 */
export const asPackagingRecyclingNotes = (data) =>
  /** @type {PackagingRecyclingNote[]} */ (data)

/**
 * Casts a partial mock object to the `PackagingRecyclingNote` shape that
 * `createPrn` resolves.
 * @param {unknown} data
 * @returns {PackagingRecyclingNote}
 */
export const asCreatePrnResponse = (data) =>
  /** @type {PackagingRecyclingNote} */ (data)

/**
 * Casts a partial mock object to the `PackagingRecyclingNote` shape that
 * `updatePrnStatus` resolves.
 * @param {unknown} data
 * @returns {PackagingRecyclingNote}
 */
export const asUpdatePrnStatusResponse = (data) =>
  /** @type {PackagingRecyclingNote} */ (data)

/**
 * Casts a partial mock object to the `IssuedToOrganisation` shape used on PRN
 * responses, so tests can supply only the fields the code path reads.
 * @param {unknown} data
 * @returns {IssuedToOrganisation}
 */
export const asIssuedToOrganisation = (data) =>
  /** @type {IssuedToOrganisation} */ (data)

/**
 * A draft PRN as the backend serves it.
 * @param {Partial<PrnResource>} [overrides]
 * @returns {PrnResource}
 */
export const buildPrnResource = (overrides = {}) => ({
  id: 'prn-789',
  status: {
    current: 'draft',
    timeline: [
      {
        status: 'draft',
        at: '2026-01-15T10:00:00.000Z',
        by: { name: 'Creator User' }
      }
    ]
  },
  issuedToOrganisation: { id: 'producer-1', name: 'Acme Packaging Ltd' },
  issuer: {
    registration: {
      accreditation: {
        accreditationNumber: 'ACC-001',
        accreditationYear: 2026,
        wasteProcessingType: 'reprocessor',
        material: 'plastic'
      }
    }
  },
  tonnage: 100,
  processToBeUsed: 'R3',
  isDecemberWaste: false,
  obligationYear: 2026,
  createdAt: '2026-01-15T10:00:00.000Z',
  ...overrides
})

/**
 * Casts a partial mock object to the `WasteBalance` shape that
 * `fetchPrnWasteBalance` resolves.
 * @param {unknown} data
 * @returns {WasteBalance}
 */
export const asWasteBalance = (data) => /** @type {WasteBalance} */ (data)
