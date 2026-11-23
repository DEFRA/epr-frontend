import { getYear } from 'date-fns'

import { REGISTRATION_STATUS } from '#domain/organisations/model.js'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

/**
 * @import { AppliedForMaterial, Material, RegistrationStatus } from '#domain/organisations/model.js'
 */

/**
 * @typedef {(
 *   { kind: 'reapply'; href: string; year: number }
 *   | { kind: 'manage'; href: string }
 * )} ReapplyLink
 */

/**
 * @typedef {{
 *   now: Date;
 *   baseUrl: string;
 *   organisationNumber: string;
 *   registrationNumber: string;
 *   registrationMaterial: Material;
 *   registrationStatus: RegistrationStatus;
 *   year: number;
 * }} ManageLinkParams
 */

/**
 * @param {ManageLinkParams} params
 * @returns {boolean}
 */
const offersALink = ({ now, baseUrl, registrationStatus, year }) =>
  // No base URL means WS2 is not wired up for this environment yet: hide the
  // link rather than render a broken same-origin relative href.
  !!baseUrl &&
  registrationStatus === REGISTRATION_STATUS.APPROVED &&
  // Phase 1 only renews a CURRENT-YEAR accreditation (PAE-1791 AC 5/6).
  // Not-accredited-this-year is deferred to Phase 2 / PAE-1801.
  year === getYear(now)

/**
 * @param {ManageLinkParams} params
 * @returns {string}
 */
const manageHref = ({
  baseUrl,
  organisationNumber,
  registrationNumber,
  registrationMaterial
}) =>
  new URL(
    `/manage/${encodeURIComponent(organisationNumber)}/${encodeURIComponent(registrationNumber)}/${encodeURIComponent(registrationMaterial)}`,
    baseUrl
  ).href

/**
 * @param {ManageLinkParams} params
 * @returns {Extract<ReapplyLink, { kind: 'manage' }> | null}
 */
export const buildManageLink = (params) =>
  offersALink(params) ? { kind: 'manage', href: manageHref(params) } : null

/**
 * Compute the "Reapply for accreditation" link inside the window, the manage
 * link outside it, or `null` when the operator is not eligible. Returning the link (or nothing) rather than a separate
 * visibility flag keeps the two in step by construction. The link copy is
 * localised in the template from the returned `year`, so this helper stays free
 * of presentation concerns.
 * @param {ManageLinkParams & {
 *   window: {
 *     windowStart: string;
 *     windowEnd: string;
 *   };
 *   organisationId: string;
 *   registrationId: string;
 *   material: AppliedForMaterial;
 * }} params
 * @returns {ReapplyLink | null}
 */
export const buildReapplyAccreditation = (params) => {
  const {
    now,
    window,
    baseUrl,
    organisationId,
    registrationId,
    material,
    year
  } = params

  if (!offersALink(params)) {
    return null
  }

  if (!isWithinReapplyWindow(now, window)) {
    return { kind: 'manage', href: manageHref(params) }
  }

  const nextYear = year + 1
  // Bare `glass`, not its sub-type: WS2 resolves that from the registration id.
  const path = `/operator-accreditation/${encodeURIComponent(organisationId)}/${encodeURIComponent(registrationId)}/${encodeURIComponent(material)}/${nextYear}`
  const href = new URL(path, baseUrl).href

  return { kind: 'reapply', href, year: nextYear }
}
