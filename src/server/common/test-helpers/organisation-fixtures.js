/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 */

/**
 * Casts loosely-typed JSON fixture data to the `Organisation` domain type, so
 * fixtures can be fed to typed mocks without repeating an inline cast.
 * @param {unknown} data
 * @returns {Organisation}
 */
export const asOrganisation = (data) => /** @type {Organisation} */ (data)

/**
 * Casts a partial mock object to the `RegistrationWithAccreditation` shape that
 * `fetchRegistrationAndAccreditation` resolves, so tests can supply only the
 * fields the code path under test reads.
 * @param {unknown} data
 * @returns {RegistrationWithAccreditation}
 */
export const asRegistrationWithAccreditation = (data) =>
  /** @type {RegistrationWithAccreditation} */ (data)

/**
 * Casts a partial mock object to `Required<RegistrationWithAccreditation>`, the
 * shape `getRequiredRegistrationWithAccreditation` resolves (accreditation
 * guaranteed present).
 * @param {unknown} data
 * @returns {Required<RegistrationWithAccreditation>}
 */
export const asRequiredRegistrationWithAccreditation = (data) =>
  /** @type {Required<RegistrationWithAccreditation>} */ (data)

/**
 * Extracts a registration and its linked accreditation from an organisation
 * fixture, returning the full `RegistrationWithAccreditation` shape that
 * `fetchRegistrationAndAccreditation` resolves.
 * @param {unknown} fixture
 * @param {string} registrationId
 * @returns {RegistrationWithAccreditation}
 */
export const findRegistrationAndAccreditation = (fixture, registrationId) => {
  const organisationData = asOrganisation(fixture)
  const registration = organisationData.registrations.find(
    ({ id }) => id === registrationId
  )

  if (!registration) {
    throw new Error(`fixture has no registration '${registrationId}'`)
  }

  const accreditation = organisationData.accreditations.find(
    ({ id }) => id === registration.accreditationId
  )

  return { organisationData, registration, accreditation }
}
