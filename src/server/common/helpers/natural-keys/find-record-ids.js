import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

import { registrationsNumbered } from './swap-keys.js'

/**
 * @import { AppliedForMaterial } from '#domain/organisations/model.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @param {RegistrationKeys} keys
 */
const unresolved = ({ organisationNumber, registrationNumber }) =>
  notFound('Record not found by key', errorCodes.recordKeyUnresolved, {
    event: {
      action: 'find_record_ids',
      reason: `organisationNumber=${organisationNumber} registrationNumber=${registrationNumber}`
    }
  })

/**
 * Ids for the renewal link only, until the registration service accepts
 * numbers. Only an operator reaches that page, so the organisation is the one
 * their session is linked to.
 * @param {RegistrationKeys} keys
 * @param {UserSession} credentials
 * @returns {Promise<{ organisationId: string, registrationId: string, material: AppliedForMaterial }>}
 */
export const findRecordIds = async (keys, credentials) => {
  if (!credentials.linkedOrganisationId) {
    throw unresolved(keys)
  }

  const organisation = await fetchOrganisationById(
    credentials.linkedOrganisationId,
    credentials.backendToken
  )
  const matches = registrationsNumbered(organisation, keys.registrationNumber)

  if (
    organisation.orgId !== Number(keys.organisationNumber) ||
    matches.length !== 1
  ) {
    throw unresolved(keys)
  }

  const [{ id: registrationId, material }] = matches

  return { organisationId: organisation.id, registrationId, material }
}
