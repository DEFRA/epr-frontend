import { toYear } from '#server/common/helpers/year.js'
import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { describe, expect, it } from 'vitest'

import { toNaturalKeys } from './swap-keys.js'

/** @import { OrganisationById } from './types.js' */

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'
const accreditationId = '6507f1f77bcf86cd79943903'

/** @type {OrganisationById['registrations'][number]} */
const registration = {
  id: registrationId,
  registrationNumber: toRegistrationNumber('R26ER5001180041PL'),
  accreditationId,
  material: 'plastic'
}

/** @type {OrganisationById['accreditations'][number]} */
const accreditation = {
  id: accreditationId,
  accreditationNumber: toAccreditationNumber('A26ER5001180114PL'),
  validFrom: '2026-07-01'
}

/**
 * @param {Partial<Pick<OrganisationById, 'registrations' | 'accreditations'>>} [overrides]
 * @returns {OrganisationById}
 */
const anOrganisation = ({
  registrations = [registration],
  accreditations = [accreditation]
} = {}) => ({
  id: organisationId,
  orgId: 500118,
  registrations,
  accreditations
})

describe(toNaturalKeys, () => {
  const allIds = { organisationId, registrationId, accreditationId }

  it('names the organisation by its number', () => {
    expect(toNaturalKeys(anOrganisation(), { organisationId })).toStrictEqual({
      organisationNumber: toOrganisationNumber('500118')
    })
  })

  it('names a registration by its number', () => {
    expect(
      toNaturalKeys(anOrganisation(), { organisationId, registrationId })
    ).toStrictEqual({
      organisationNumber: toOrganisationNumber('500118'),
      registrationNumber: toRegistrationNumber('R26ER5001180041PL')
    })
  })

  it('names an accreditation by the UTC year it starts in', () => {
    expect(toNaturalKeys(anOrganisation(), allIds)).toStrictEqual({
      organisationNumber: toOrganisationNumber('500118'),
      registrationNumber: toRegistrationNumber('R26ER5001180041PL'),
      year: toYear(2026)
    })
  })

  it('finds no registration by an unknown id', () => {
    expect(
      toNaturalKeys(anOrganisation(), {
        organisationId,
        registrationId: '6507f1f77bcf86cd799439ff'
      })
    ).toBeNull()
  })

  it('finds no number for a registration that has none', () => {
    expect(
      toNaturalKeys(
        anOrganisation({
          registrations: [{ ...registration, registrationNumber: undefined }]
        }),
        allIds
      )
    ).toBeNull()
  })

  it('finds no number for a registration that shares its number', () => {
    expect(
      toNaturalKeys(
        anOrganisation({
          registrations: [
            registration,
            { ...registration, id: '6507f1f77bcf86cd799439aa' }
          ]
        }),
        allIds
      )
    ).toBeNull()
  })

  it('finds no year for an accreditation its registration does not link to', () => {
    expect(
      toNaturalKeys(anOrganisation(), {
        ...allIds,
        accreditationId: '6507f1f77bcf86cd799439ff'
      })
    ).toBeNull()
  })

  it('finds no year when the registration links to no accreditation', () => {
    expect(
      toNaturalKeys(
        anOrganisation({
          registrations: [{ ...registration, accreditationId: undefined }]
        }),
        allIds
      )
    ).toBeNull()
  })

  it('finds no year for a linked accreditation the organisation does not hold', () => {
    expect(
      toNaturalKeys(anOrganisation({ accreditations: [] }), allIds)
    ).toBeNull()
  })

  it('finds no year for an accreditation with no number', () => {
    expect(
      toNaturalKeys(
        anOrganisation({
          accreditations: [{ ...accreditation, accreditationNumber: undefined }]
        }),
        allIds
      )
    ).toBeNull()
  })

  it('finds no year for an accreditation with no start date', () => {
    expect(
      toNaturalKeys(
        anOrganisation({
          accreditations: [{ ...accreditation, validFrom: undefined }]
        }),
        allIds
      )
    ).toBeNull()
  })
})
