import { ACCREDITATION_STATUS } from '#domain/organisations/model.js'

/**
 * @import { AccreditationStatus } from '#domain/organisations/model.js'
 * @import { Accreditation } from './organisation-view.js'
 */

/** @type {ReadonlySet<AccreditationStatus>} */
const ACTIVE_ACCREDITATION_STATUSES = new Set([
  ACCREDITATION_STATUS.APPROVED,
  ACCREDITATION_STATUS.SUSPENDED
])

/**
 * Returns true when the accreditation in the organisation view is live.
 * @param {Accreditation | undefined} accreditation
 * @returns {accreditation is Accreditation}
 */
export const isAccreditationActive = (accreditation) =>
  !!accreditation &&
  ACTIVE_ACCREDITATION_STATUSES.has(accreditation.status.current)
