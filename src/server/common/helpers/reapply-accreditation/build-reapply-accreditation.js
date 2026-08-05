import { getYear, parseISO } from 'date-fns'

import { REG_ACC_STATUS } from '#domain/organisations/model.js'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

/**
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 */

/**
 * Accreditation statuses that count as "accredited this year" for the reapply
 * link (PAE-1791 AC 5/6). Unlike `isAccreditationActive` this includes
 * `cancelled`: a cancelled accreditation is still a prior accreditation
 * eligible for renewal.
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
 *   link: { href: string; year: number } | null;
 * }} ReapplyAccreditation
 */

/**
 * Compute the "Reapply for accreditation" link visibility and target. The link
 * copy is localised in the template from the returned `year`, so this helper
 * stays free of presentation concerns.
 * @param {{
 *   now: Date;
 *   window: { windowStart: string; windowEnd: string };
 *   baseUrl: string;
 *   organisationId: string;
 *   registration: Registration;
 *   accreditation: Accreditation | undefined;
 * }} params
 * @returns {ReapplyAccreditation}
 */
export const buildReapplyAccreditation = ({
  now,
  window,
  baseUrl,
  organisationId,
  registration,
  accreditation
}) => {
  if (
    // No base URL means WS2 is not wired up for this environment yet: hide the
    // link rather than render a broken same-origin relative href.
    !baseUrl ||
    !isWithinReapplyWindow(now, window) ||
    registration.status !== REG_ACC_STATUS.APPROVED ||
    !accreditation ||
    !ACCREDITED_STATUSES.has(accreditation.status) ||
    // `validFrom` is typed as optional on non-approved accreditation shapes, so
    // guard the link-year derivation below: without it we cannot compute a year
    // and must not render a `.../NaN` link. Defence against the loose type, not
    // a business eligibility rule.
    !accreditation.validFrom
  ) {
    return { isVisible: false, link: null }
  }

  const year = getYear(parseISO(accreditation.validFrom)) + 1
  // `registration.material` is sent as the raw lowercase slug, verbatim. For
  // glass this is the bare `glass` value, not the remelt/other sub-type: WS2
  // resolves the sub-type from the registration id when it pre-populates the
  // renewal, so nothing is lost. All material values are safe URL slugs.
  const href = `${baseUrl}/operator-accreditation/${organisationId}/${registration.id}/${registration.material}/${year}`

  return { isVisible: true, link: { href, year } }
}
