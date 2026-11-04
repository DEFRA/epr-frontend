import { describe, expect, test } from 'vitest'
import { buildReapplyAccreditation } from '#server/common/helpers/reapply-accreditation/build-reapply-accreditation.js'

/**
 * @import { AppliedForMaterial, RegistrationStatus } from '#domain/organisations/model.js'
 */

const baseParams = {
  now: new Date('2026-10-01T12:00:00'),
  window: { windowStart: '09-01T09:00', windowEnd: '12-31T23:59' },
  baseUrl: 'https://ws2.example',
  organisationId: 'org1',
  registrationId: 'reg1',
  material: /** @type {AppliedForMaterial} */ ('plastic'),
  registrationStatus: /** @type {RegistrationStatus} */ ('approved'),
  year: 2026
}

describe('#buildReapplyAccreditation', () => {
  test('is visible and builds the link for the current year in-window', () => {
    const result = buildReapplyAccreditation(baseParams)

    expect(result).toStrictEqual({
      href: 'https://ws2.example/operator-accreditation/org1/reg1/plastic/2027',
      year: 2027
    })
  })

  test('is not visible for a prior year', () => {
    const result = buildReapplyAccreditation({ ...baseParams, year: 2025 })

    expect(result).toBeNull()
  })

  test('links to the year after the current one', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      now: new Date('2027-10-01T12:00:00'),
      year: 2027
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
      material: 'glass'
    })

    expect(result?.href).toBe(
      'https://ws2.example/operator-accreditation/org1/reg1/glass/2027'
    )
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

  test('is not visible before the configured window opening time', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      now: new Date('2026-09-01T07:00:00Z')
    })

    expect(result).toBeNull()
  })

  test('is not visible when the registration is not approved', () => {
    const result = buildReapplyAccreditation({
      ...baseParams,
      registrationStatus: 'created'
    })

    expect(result).toBeNull()
  })
})
