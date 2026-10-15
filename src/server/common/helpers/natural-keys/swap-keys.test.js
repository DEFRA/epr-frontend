import { describe, expect, it } from 'vitest'

import { toIds, toNaturalKeys } from './swap-keys.js'

/** @import { Organisation } from '#domain/organisations/model.js' */

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'
const accreditationId = '6507f1f77bcf86cd79943903'

const registration = {
  id: registrationId,
  registrationNumber: 'R26ER5001180041PL',
  accreditationId
}

const accreditation = {
  id: accreditationId,
  accreditationNumber: 'A26ER5001180114PL',
  validFrom: '2026-07-01'
}

/**
 * @param {{ registrations?: object[], accreditations?: object[] }} [overrides]
 * @returns {Organisation}
 */
const anOrganisation = ({
  registrations = [registration],
  accreditations = [accreditation]
} = {}) =>
  /** @type {Organisation} */ (
    /** @type {unknown} */ ({
      id: organisationId,
      orgId: 500118,
      registrations,
      accreditations
    })
  )

describe('swapping keys', () => {
  it.each([
    ['the organisation', { organisationId }],
    ['a registration', { organisationId, registrationId }],
    ['an accreditation', { organisationId, registrationId, accreditationId }]
  ])('swaps the ids of %s for natural keys and back', (_, ids) => {
    const organisation = anOrganisation()
    const keys = toNaturalKeys(organisation, ids)

    expect(keys).not.toBeNull()
    expect(toIds(organisation, /** @type {never} */ (keys))).toStrictEqual(ids)
  })

  it('names an accreditation by the UTC year it starts in', () => {
    expect(
      toNaturalKeys(anOrganisation(), {
        organisationId,
        registrationId,
        accreditationId
      })
    ).toStrictEqual({
      organisationNumber: '500118',
      registrationNumber: 'R26ER5001180041PL',
      year: '2026'
    })
  })
})

describe(toNaturalKeys, () => {
  const allIds = { organisationId, registrationId, accreditationId }

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

describe(toIds, () => {
  const allKeys = {
    organisationNumber: '500118',
    registrationNumber: 'R26ER5001180041PL',
    year: '2026'
  }

  it('finds no registration by an unknown number', () => {
    expect(
      toIds(anOrganisation(), {
        ...allKeys,
        registrationNumber: 'R26ER5001189999PL'
      })
    ).toBeNull()
  })

  it('finds no registration when two share the number', () => {
    expect(
      toIds(
        anOrganisation({
          registrations: [
            registration,
            { ...registration, id: '6507f1f77bcf86cd799439aa' }
          ]
        }),
        allKeys
      )
    ).toBeNull()
  })

  it('finds no accreditation when the registration links to none', () => {
    expect(
      toIds(
        anOrganisation({
          registrations: [{ ...registration, accreditationId: undefined }]
        }),
        allKeys
      )
    ).toBeNull()
  })

  it('finds no accreditation the organisation does not hold', () => {
    expect(toIds(anOrganisation({ accreditations: [] }), allKeys)).toBeNull()
  })

  it('finds no accreditation with no number', () => {
    expect(
      toIds(
        anOrganisation({
          accreditations: [{ ...accreditation, accreditationNumber: undefined }]
        }),
        allKeys
      )
    ).toBeNull()
  })

  it('finds no accreditation with no start date', () => {
    expect(
      toIds(
        anOrganisation({
          accreditations: [{ ...accreditation, validFrom: undefined }]
        }),
        allKeys
      )
    ).toBeNull()
  })

  it('finds no accreditation for another year', () => {
    expect(toIds(anOrganisation(), { ...allKeys, year: '2027' })).toBeNull()
  })
})
