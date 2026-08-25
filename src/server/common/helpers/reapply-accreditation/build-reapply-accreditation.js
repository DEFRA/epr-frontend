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
 * @typedef {{ href: string; year: number }} ReapplyLink
 */

/**
 * Compute the "Reapply for accreditation" link, or `null` when the operator is
 * not eligible. Returning the link (or nothing) rather than a separate
 * visibility flag keeps the two in step by construction. The link copy is
 * localised in the template from the returned `year`, so this helper stays free
 * of presentation concerns.
 * @param {{
 *   now: Date;
 *   window: {
 *     windowStartMonth: number;
 *     windowEndMonth: number;
 *     windowStartTime: string;
 *   };
 *   baseUrl: string;
 *   organisationId: string;
 *   registration: Registration;
 *   accreditation: Accreditation | undefined;
 * }} params
 * @returns {ReapplyLink | null}
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
    return null
  }

  // Phase 1 only renews a CURRENT-YEAR accreditation (PAE-1791 AC 5/6). A
  // prior-year accreditation (the group `cancelled` was added for) would point
  // the link at a past year, so gate on the accreditation year matching `now`.
  // Not-accredited-this-year is deferred to Phase 2 / PAE-1801.
  const accreditationYear = getYear(parseISO(accreditation.validFrom))
  if (accreditationYear !== getYear(now)) {
    return null
  }

  const year = accreditationYear + 1
  // `registration.material` is sent as the raw lowercase slug, verbatim. For
  // glass this is the bare `glass` value, not the remelt/other sub-type: WS2
  // resolves the sub-type from the registration id when it pre-populates the
  // renewal, so nothing is lost. The segments are already safe (24-hex ids, a
  // slug), but encode them defensively and build with `new URL` so a trailing
  // slash on `baseUrl` cannot produce a double slash. `baseUrl` is validated as
  // a URL at config load, so this never throws.
  const path = `/operator-accreditation/${encodeURIComponent(organisationId)}/${encodeURIComponent(registration.id)}/${encodeURIComponent(registration.material)}/${year}`
  const href = new URL(path, baseUrl).href

  return { href, year }
}
