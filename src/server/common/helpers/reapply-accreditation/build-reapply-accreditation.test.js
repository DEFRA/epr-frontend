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
  window: { windowStartMonth: 9, windowEndMonth: 12 },
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
      isVisible: true,
      link: {
        href: 'https://ws2.example/operator-accreditation/org1/reg1/plastic/2027',
        year: 2027
      }
    })
  })

  test('derives the year from validFrom + 1, not the current year', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({
        status: 'approved',
        validFrom: '2025-01-01'
      })
    })

    expect(result.link?.href).toBe(
      'https://ws2.example/operator-accreditation/org1/reg1/plastic/2026'
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

    expect(result.link?.href).toBe(
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

    expect(result.isVisible).toBe(true)
  })

  test('is visible for a cancelled accreditation', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({
        status: 'cancelled',
        validFrom: '2026-01-01'
      })
    })

    expect(result.isVisible).toBe(true)
  })

  test('is not visible when the base URL is not configured', () => {
    const result = buildReapplyAccreditation({ ...baseParams, baseUrl: '' })

    expect(result).toStrictEqual({ isVisible: false, link: null })
  })

  test('is not visible when outside the window', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      now: new Date('2026-08-31T12:00:00')
    })

    expect(result).toStrictEqual({ isVisible: false, link: null })
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

    expect(result.isVisible).toBe(false)
  })

  test('is not visible when there is no accreditation', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: undefined
    })

    expect(result.isVisible).toBe(false)
  })

  test('is not visible for a created (never accredited) accreditation', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({ status: 'created' })
    })

    expect(result.isVisible).toBe(false)
  })

  test('is not visible when validFrom is missing (cannot derive the link year)', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      accreditation: asAccreditation({ status: 'cancelled' })
    })

    expect(result.isVisible).toBe(false)
  })
})
