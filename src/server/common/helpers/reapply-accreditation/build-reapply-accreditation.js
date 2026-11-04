import { getYear } from 'date-fns'

import { REGISTRATION_STATUS } from '#domain/organisations/model.js'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

/**
 * @import { AppliedForMaterial, RegistrationStatus } from '#domain/organisations/model.js'
 */

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
 *     windowStart: string;
 *     windowEnd: string;
 *   };
 *   baseUrl: string;
 *   organisationId: string;
 *   registrationId: string;
 *   material: AppliedForMaterial;
 *   registrationStatus: RegistrationStatus;
 *   year: number;
 * }} params
 * @returns {ReapplyLink | null}
 */
export const buildReapplyAccreditation = ({
  now,
  window,
  baseUrl,
  organisationId,
  registrationId,
  material,
  registrationStatus,
  year
}) => {
  if (
    // No base URL means WS2 is not wired up for this environment yet: hide the
    // link rather than render a broken same-origin relative href.
    !baseUrl ||
    !isWithinReapplyWindow(now, window) ||
    registrationStatus !== REGISTRATION_STATUS.APPROVED ||
    // Phase 1 only renews a CURRENT-YEAR accreditation (PAE-1791 AC 5/6).
    // Not-accredited-this-year is deferred to Phase 2 / PAE-1801.
    year !== getYear(now)
  ) {
    return null
  }

  const nextYear = year + 1
  // Bare `glass`, not its sub-type: WS2 resolves that from the registration id.
  const path = `/operator-accreditation/${encodeURIComponent(organisationId)}/${encodeURIComponent(registrationId)}/${encodeURIComponent(material)}/${nextYear}`
  const href = new URL(path, baseUrl).href

  return { href, year: nextYear }
}
