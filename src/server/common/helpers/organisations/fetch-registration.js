import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'

import { fetchOrganisation } from './fetch-organisation.js'
import { registrationIn, registrationNotFound } from './registration-in-view.js'

/**
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { OrganisationView, RegistrationView } from './organisation-view.js'
 */

/**
 * The registration from the organisation read model, as it stood in `year`
 * when one is given; an unknown organisation is a registration not found.
 * @param {RegistrationKeys & { backendToken: BackendToken }} params
 * @param {{ year?: Year }} [options]
 * @returns {Promise<{ organisation: OrganisationView, registration: RegistrationView }>}
 */
export const fetchRegistration = async (
  { backendToken, ...keys },
  options = {}
) => {
  const organisation = await fetchOrganisation(
    keys.organisationNumber,
    backendToken,
    options
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
