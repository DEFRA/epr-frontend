import { organisationNumberOf } from '#server/common/helpers/organisations/organisation-number-of.js'

/**
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 * @import { NaturalKeys, OrganisationById, RecordIds } from './types.js'
 */

/**
 * @param {OrganisationById} organisation
 * @param {RegistrationNumber} registrationNumber
 */
export const registrationsNumbered = (organisation, registrationNumber) =>
  organisation.registrations.filter(
    (registration) => registration.registrationNumber === registrationNumber
  )

/**
 * The year a numbered accreditation is for: the UTC year it starts in.
 * @param {OrganisationById} organisation
 * @param {string} accreditationId
 * @returns {string | null}
 */
const accreditationYear = (organisation, accreditationId) => {
  const accreditation = organisation.accreditations.find(
    ({ id }) => id === accreditationId
  )

  if (!accreditation?.accreditationNumber || !accreditation.validFrom) {
    return null
  }

  return String(new Date(accreditation.validFrom).getUTCFullYear())
}

/**
 * @param {OrganisationById} organisation
 * @param {RecordIds} ids
 * @returns {NaturalKeys | null}
 */
export const toNaturalKeys = (
  organisation,
  { registrationId, accreditationId }
) => {
  const organisationNumber = organisationNumberOf(organisation)

  if (registrationId === undefined) {
    return { organisationNumber }
  }

  const registration = organisation.registrations.find(
    ({ id }) => id === registrationId
  )
  const registrationNumber = registration?.registrationNumber

  if (
    !registrationNumber ||
    registrationsNumbered(organisation, registrationNumber).length !== 1
  ) {
    return null
  }

  if (accreditationId === undefined) {
    return { organisationNumber, registrationNumber }
  }

  const year =
    registration.accreditationId === accreditationId
      ? accreditationYear(organisation, accreditationId)
      : null

  return year ? { organisationNumber, registrationNumber, year } : null
}
