/** @import { Accreditation } from '#domain/organisations/accreditation.js' */

const ACTIVE_ACCREDITATION_STATUSES = new Set(['approved', 'suspended'])

/**
 * Returns true when the accreditation is live (approved or suspended).
 * A 'created', 'rejected', or 'cancelled' accreditation must be treated as
 * registered-only — it has never been active.
 * @param {Accreditation | undefined | null} accreditation
 * @returns {boolean}
 */
export const isAccreditationActive = (accreditation) =>
  !!accreditation && ACTIVE_ACCREDITATION_STATUSES.has(accreditation.status)
