/** @import { Accreditation } from './organisation-view.js' */

const ACTIVE_ACCREDITATION_STATUSES = new Set(['approved', 'suspended'])

/**
 * Returns true when the accreditation in the organisation view is live.
 * @param {Accreditation | undefined} accreditation
 * @returns {accreditation is Accreditation}
 */
export const isAccreditationActive = (accreditation) =>
  !!accreditation &&
  ACTIVE_ACCREDITATION_STATUSES.has(accreditation.status.current)
