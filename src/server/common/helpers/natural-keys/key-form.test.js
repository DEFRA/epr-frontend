import { describe, expect, it } from 'vitest'

import { routeKeySegments, urlKeyForm } from './key-form.js'

/** @import { KeyedSegment } from './key-form.js' */

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'
const accreditationId = '6507f1f77bcf86cd79943903'

/** @type {KeyedSegment[]} */
const accreditationSegments = [
  { index: 2, record: 'organisation' },
  { index: 4, record: 'registration' },
  { index: 6, record: 'accreditation' }
]

/**
 * @param {string[]} values
 * @returns {string[]}
 */
const pathOf = ([organisation, registration, accreditation]) =>
  `/organisations/${organisation}/registrations/${registration}/accreditations/${accreditation}/page`.split(
    '/'
  )

describe(routeKeySegments, () => {
  it('reads a route addressed by natural keys', () => {
    expect(
      routeKeySegments(
        '/organisations/{organisationNumber}/registrations/{registrationNumber}/accreditations/{year}/packaging-recycling-notes'
      )
    ).toStrictEqual(accreditationSegments)
  })

  it('reads a PRN step route by its three record keys, not the note id', () => {
    expect(
      routeKeySegments(
        '/organisations/{organisationNumber}/registrations/{registrationNumber}/accreditations/{year}/packaging-recycling-notes/{prnId}/view'
      )
    ).toStrictEqual(accreditationSegments)
  })

  it('reads a route that names only the organisation', () => {
    expect(
      routeKeySegments('/organisations/{organisationNumber}')
    ).toStrictEqual([{ index: 2, record: 'organisation' }])
  })

  it('does not count a report year as the accreditation', () => {
    expect(
      routeKeySegments(
        '/organisations/{organisationNumber}/registrations/{registrationNumber}/reports/{year}/{cadence}'
      )
    ).toStrictEqual([
      { index: 2, record: 'organisation' },
      { index: 4, record: 'registration' }
    ])
  })

  it.each([
    '/regulators/home',
    '/account/linking',
    '/organisations/{organisationId}/registrations/{registrationId}'
  ])('ignores %s, which names no record by natural key', (routePath) => {
    expect(routeKeySegments(routePath)).toBeNull()
  })
})

describe(urlKeyForm, () => {
  it('reads ids', () => {
    expect(
      urlKeyForm(
        pathOf([organisationId, registrationId, accreditationId]),
        accreditationSegments
      )
    ).toBe('ids')
  })

  it('reads a 24-digit organisation value as an id', () => {
    expect(
      urlKeyForm(
        ['', 'organisations', '650712345678901234567890'],
        /** @type {KeyedSegment[]} */ ([{ index: 2, record: 'organisation' }])
      )
    ).toBe('ids')
  })

  it('reads natural keys', () => {
    expect(
      urlKeyForm(
        pathOf(['500123', 'R26ER5001180041PL', '2026']),
        accreditationSegments
      )
    ).toBe('naturalKeys')
  })

  it('reads neither form from a mix of the two', () => {
    expect(
      urlKeyForm(
        pathOf(['500123', registrationId, '2026']),
        accreditationSegments
      )
    ).toBeNull()
  })

  it.each([
    ['org-123', 'reg-001', 'acc-001'],
    ['123', '456', '789']
  ])('reads neither form from made-up ids %s, %s, %s', (...values) => {
    expect(urlKeyForm(pathOf(values), accreditationSegments)).toBeNull()
  })
})
