import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'

import { fetchOrganisation } from './fetch-organisation.js'
import { registrationIn, registrationNotFound } from './registration-in-view.js'

/**
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { OrganisationView, RegistrationView } from './organisation-view.js'
 */

/**
 * The registration from the organisation read model; an unknown organisation is a registration not found.
 * @param {RegistrationKeys & { backendToken: string }} params
 * @returns {Promise<{ organisation: OrganisationView, registration: RegistrationView }>}
 */
export const fetchRegistration = async ({ backendToken, ...keys }) => {
  const organisation = await fetchOrganisation(
    organisationNumber(Number(keys.organisationNumber)),
    backendToken
  ).catch((error) => {
    if (!Boom.isBoom(error, statusCodes.notFound)) {
      throw error
    }

    throw registrationNotFound(keys)
  })

  return {
    organisation,
    registration: registrationIn(organisation, keys.registrationNumber)
  }
}
