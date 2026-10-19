/** @import { AccreditationStatus } from '#domain/organisations/model.js' */
/** @import { AccreditationView } from './organisation-view.js' */

const ACTIVE_ACCREDITATION_STATUSES = new Set(['approved', 'suspended'])

/**
 * Returns true when the accreditation is live (approved or suspended).
 * A 'created', 'rejected', or 'cancelled' accreditation must be treated as
 * registered-only — it has never been active.
 * @param {{ status: AccreditationStatus } | undefined | null} accreditation
 * @returns {boolean}
 */
export const isAccreditationActive = (accreditation) =>
  !!accreditation && ACTIVE_ACCREDITATION_STATUSES.has(accreditation.status)

/**
 * Returns true when the accreditation in the organisation view is live.
 * @param {AccreditationView | undefined} accreditation
 * @returns {accreditation is AccreditationView}
 */
export const isAccreditationViewActive = (accreditation) =>
  !!accreditation &&
  ACTIVE_ACCREDITATION_STATUSES.has(accreditation.status.current)
