import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

import { findOrganisationByNumber } from './find-organisation.js'
import { toIds } from './swap-keys.js'

/**
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @param {AccreditationKeys} keys
 */
const unresolved = ({ organisationNumber, registrationNumber, year }) =>
  notFound('Record not found by key', errorCodes.recordKeyUnresolved, {
    event: {
      action: 'find_record_ids',
      reason: `organisationNumber=${organisationNumber} registrationNumber=${registrationNumber} year=${year}`
    }
  })

/**
 * Ids for the reapply link only, until the registration service accepts numbers.
 * @param {AccreditationKeys} keys
 * @param {UserSession} credentials
 * @returns {Promise<{ organisationId: string, registrationId: string, accreditationId: string, registration: Registration }>}
 */
export const findRecordIds = async (keys, credentials) => {
  const organisation = await findOrganisationByNumber(
    keys.organisationNumber,
    credentials
  )

  if (!organisation) {
    throw unresolved(keys)
  }

  const ids = toIds(organisation, keys)

  if (!ids) {
    throw unresolved(keys)
  }

  // toIds names all three ids when given a year
  const { organisationId, registrationId, accreditationId } =
    /** @type {{ organisationId: string, registrationId: string, accreditationId: string }} */ (
      ids
    )
  const registration = /** @type {Registration} */ (
    organisation.registrations.find(({ id }) => id === registrationId)
  )

  return { organisationId, registrationId, accreditationId, registration }
}
