import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

/**
 * @import { OrganisationView, RegistrationView } from './organisation-view.js'
 */

/**
 * The organisation's registration with that number.
 * @param {OrganisationView} organisation
 * @param {string} registrationNumber
 * @returns {RegistrationView}
 */
export const registrationIn = (organisation, registrationNumber) => {
  if (!Object.hasOwn(organisation.registrations, registrationNumber)) {
    throw notFound('Registration not found', errorCodes.registrationNotFound, {
      event: {
        action: 'fetch_registration',
        reason: `organisationNumber=${organisation.organisationNumber} registrationNumber=${registrationNumber}`
      }
    })
  }

  return organisation.registrations[registrationNumber]
}
