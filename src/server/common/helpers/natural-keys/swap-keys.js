/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { NaturalKeys, RecordIds } from './types.js'
 */

/**
 * @param {Organisation} organisation
 * @param {string} registrationNumber
 */
const registrationsNumbered = (organisation, registrationNumber) =>
  organisation.registrations.filter(
    (registration) => registration.registrationNumber === registrationNumber
  )

/**
 * The year a numbered accreditation is for: the UTC year it starts in.
 * @param {Organisation} organisation
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
 * @param {Organisation} organisation
 * @param {RecordIds} ids
 * @returns {NaturalKeys | null}
 */
export const toNaturalKeys = (
  organisation,
  { registrationId, accreditationId }
) => {
  const organisationNumber = String(organisation.orgId)

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

/**
 * @param {Organisation} organisation
 * @param {NaturalKeys} keys
 * @returns {RecordIds | null}
 */
export const toIds = (organisation, { registrationNumber, year }) => {
  const organisationId = organisation.id

  if (registrationNumber === undefined) {
    return { organisationId }
  }

  const matches = registrationsNumbered(organisation, registrationNumber)

  if (matches.length !== 1) {
    return null
  }

  const [{ id: registrationId, accreditationId }] = matches

  if (year === undefined) {
    return { organisationId, registrationId }
  }

  if (
    !accreditationId ||
    accreditationYear(organisation, accreditationId) !== year
  ) {
    return null
  }

  return { organisationId, registrationId, accreditationId }
}
