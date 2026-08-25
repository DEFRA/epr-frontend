import { describe, expect, test } from 'vitest'
import { buildReapplyAccreditation } from '#server/common/helpers/reapply-accreditation/build-reapply-accreditation.js'

/**
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 */

/**
 * @param {unknown} r
 * @returns {Registration}
 */
const asRegistration = (r) => /** @type {Registration} */ (r)
/**
 * @param {unknown} a
 * @returns {Accreditation}
 */
const asAccreditation = (a) => /** @type {Accreditation} */ (a)

const baseParams = {
  now: new Date('2026-10-01T12:00:00'),
  window: { windowStart: '09-01T09:00', windowEnd: '12-31T23:59' },
  baseUrl: 'https://ws2.example',
  organisationId: 'org1',
  registration: asRegistration({
    id: 'reg1',
    material: 'plastic',
    status: 'approved'
  }),
  accreditation: asAccreditation({
    status: 'approved',
    validFrom: '2026-01-01'
  })
}

describe('#buildReapplyAccreditation', () => {
  test('is visible and builds the link for an approved accreditation in-window', () => {
    const result = buildReapplyAccreditation(baseParams)

    expect(result).toStrictEqual({
      href: 'https://ws2.example/operator-accreditation/org1/reg1/plastic/2027',
      year: 2027
    })
  })

  test('is not visible for a prior-year accreditation', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({
        status: 'approved',
        validFrom: '2025-01-01'
      })
    })

    expect(result).toBeNull()
  })

  test('derives the link year from the current accreditation year + 1', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      now: new Date('2027-10-01T12:00:00'),
      accreditation: asAccreditation({
        status: 'approved',
        validFrom: '2027-01-01'
      })
    })

    expect(result?.href).toBe(
      'https://ws2.example/operator-accreditation/org1/reg1/plastic/2028'
    )
  })

  test('normalises a trailing slash on the base URL (no double slash)', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      baseUrl: 'https://ws2.example/'
    })

    expect(result?.href).toBe(
      'https://ws2.example/operator-accreditation/org1/reg1/plastic/2027'
    )
  })

  test('sends the material slug verbatim (bare glass, no sub-type)', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      registration: asRegistration({
        id: 'reg1',
        material: 'glass',
        status: 'approved'
      })
    })

    expect(result?.href).toBe(
      'https://ws2.example/operator-accreditation/org1/reg1/glass/2027'
    )
  })

  test('is visible for a suspended accreditation', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({
        status: 'suspended',
        validFrom: '2026-01-01'
      })
    })

    expect(result).not.toBeNull()
  })

  test('is visible for a cancelled accreditation', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({
        status: 'cancelled',
        validFrom: '2026-01-01'
      })
    })

    expect(result).not.toBeNull()
  })

  test('is not visible when the base URL is not configured', () => {
    const result = buildReapplyAccreditation({ ...baseParams, baseUrl: '' })

    expect(result).toBeNull()
  })

  test('is not visible when outside the window', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      now: new Date('2026-08-31T12:00:00')
    })

    expect(result).toBeNull()
  })

  test('is not visible before the window opening time on day 1 of the start month', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      now: new Date('2026-09-01T07:00:00Z')
    })

    expect(result).toBeNull()
  })

  test('is not visible when the registration is not approved', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      registration: asRegistration({
        id: 'reg1',
        material: 'plastic',
        status: 'created'
      })
    })

    expect(result).toBeNull()
  })

  test('is not visible when there is no accreditation', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: undefined
    })

    expect(result).toBeNull()
  })

  test('is not visible for a created (never accredited) accreditation', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({ status: 'created' })
    })

    expect(result).toBeNull()
  })

  test('is not visible when validFrom is missing (cannot derive the link year)', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({ status: 'cancelled' })
    })

    expect(result).toBeNull()
  })
})
