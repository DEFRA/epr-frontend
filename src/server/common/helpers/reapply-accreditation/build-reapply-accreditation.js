import { getYear, parseISO } from 'date-fns'

import { REG_ACC_STATUS } from '#domain/organisations/model.js'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

/**
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 */

/**
 * Accreditation statuses that count as "accredited this year" for the reapply
 * link. Unlike `isAccreditationActive` this includes `cancelled`: an
 * accreditation that was granted (so carries a `validFrom`) and later cancelled
 * is still a prior accreditation eligible for renewal. A `cancelled`
 * accreditation with no `validFrom` was never granted, so it is excluded by the
 * `validFrom` guard below.
 * @type {Set<string>}
 */
const ACCREDITED_STATUSES = new Set([
  REG_ACC_STATUS.APPROVED,
  REG_ACC_STATUS.SUSPENDED,
  REG_ACC_STATUS.CANCELLED
])

/**
 * @typedef {{
 *   isVisible: boolean;
 *   link: { href: string; text: string } | null;
 * }} ReapplyAccreditation
 */

/**
 * Compute the "Reapply for accreditation" link visibility and target.
 * @param {{
 *   now: Date;
 *   window: { windowStart: string; windowEnd: string };
 *   baseUrl: string;
 *   organisationId: string;
 *   registration: Registration;
 *   accreditation: Accreditation | undefined;
 *   text: string;
 * }} params
 * @returns {ReapplyAccreditation}
 */
export const buildReapplyAccreditation = ({
  now,
  window,
  baseUrl,
  organisationId,
  registration,
  accreditation,
  text
}) => {
  if (
    !isWithinReapplyWindow(now, window) ||
    registration.status !== REG_ACC_STATUS.APPROVED ||
    !accreditation ||
    !ACCREDITED_STATUSES.has(accreditation.status) ||
    !accreditation.validFrom
  ) {
    return { isVisible: false, link: null }
  }

  const year = getYear(parseISO(accreditation.validFrom)) + 1
  const href = `${baseUrl}/operator-accreditation/${organisationId}/${registration.id}/${registration.material}/${year}`

  return { isVisible: true, link: { href, text } }
}
