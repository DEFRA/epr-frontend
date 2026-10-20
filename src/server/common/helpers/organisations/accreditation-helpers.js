/** @import { AccreditationView } from './organisation-view.js' */

const ACTIVE_ACCREDITATION_STATUSES = new Set(['approved', 'suspended'])

/**
 * Returns true when the accreditation in the organisation view is live.
 * @param {AccreditationView | undefined} accreditation
 * @returns {accreditation is AccreditationView}
 */
export const isAccreditationViewActive = (accreditation) =>
  !!accreditation &&
  ACTIVE_ACCREDITATION_STATUSES.has(accreditation.status.current)
