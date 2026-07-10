/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 */

/*
 * These `as*` helpers each take `unknown` and assert it to a domain type, so
 * deliberately-partial fixtures compile against the real shape. They do not
 * structurally validate -- a wrong fixture (e.g. `registration: 42`) still
 * compiles -- so use them for partial test data, not as a correctness check.
 * The sibling prn-/report-/request-fixtures helpers follow the same pattern.
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
 * type `getRequiredRegistrationWithAccreditation` resolves. As above, it does
 * not enforce that shape, so tests may still inject `accreditation: null` etc.
 * @param {unknown} data
 * @returns {Required<RegistrationWithAccreditation>}
 */
export const asGetRequiredRegistrationResult = (data) =>
  /** @type {Required<RegistrationWithAccreditation>} */ (data)

/**
 * Extracts a registration and its linked accreditation from an organisation
 * fixture, returning the full `RegistrationWithAccreditation` shape that
 * `fetchRegistrationAndAccreditation` resolves.
 * @param {unknown} fixture
 * @param {string} registrationId
 * @returns {RegistrationWithAccreditation}
 * @throws {Error} when the fixture has no registration matching `registrationId`
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
