import { getYear } from 'date-fns'

import { REGISTRATION_STATUS } from '#domain/organisations/model.js'
import { isWithinReapplyWindow } from '#server/common/helpers/reapply-accreditation/is-within-reapply-window.js'

/**
 * @import { Material, RegistrationStatus } from '#domain/organisations/model.js'
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 */

/** @typedef {{ href: string }} ManageLink */

/**
 * The link to WS2's "Manage your registration and accreditation" page, or
 * `null` when the operator should not be offered it.
 * @param {{
 *   now: Date;
 *   window: { windowStart: string; windowEnd: string };
 *   baseUrl: string;
 *   organisationNumber: OrganisationNumber;
 *   registrationNumber: RegistrationNumber;
 *   material: Material;
 *   registrationStatus: RegistrationStatus;
 *   year: number;
 * }} params
 * @returns {ManageLink | null}
 */
export const buildManageLink = ({
  now,
  window,
  baseUrl,
  organisationNumber,
  registrationNumber,
  material,
  registrationStatus,
  year
}) => {
  if (
    // No base URL means WS2 is not wired up for this environment yet.
    !baseUrl ||
    // WS2's manage page 404s for a registration that is not approved.
    registrationStatus !== REGISTRATION_STATUS.APPROVED ||
    year !== getYear(now) ||
    isWithinReapplyWindow(now, window)
  ) {
    return null
  }

  const path = `/manage/${encodeURIComponent(organisationNumber)}/${encodeURIComponent(registrationNumber)}/${encodeURIComponent(material)}`

  return { href: new URL(path, baseUrl).href }
}
