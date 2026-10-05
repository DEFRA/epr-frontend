import { describe, expect, it } from 'vitest'

import { registrationUploadYear } from './registration-upload-year.js'

/** @import { Registration } from '#domain/organisations/registration.js' */

/** @type {(value: object) => Registration} */
const asRegistration = (value) =>
  /** @type {Registration} */ (/** @type {unknown} */ (value))

describe(registrationUploadYear, () => {
  it("returns the UTC year of the registration's validFrom", () => {
    expect(
      registrationUploadYear(asRegistration({ validFrom: '2025-02-02' }))
    ).toBe(2025)
  })

  it('reads validFrom as UTC, not local time', () => {
    expect(
      registrationUploadYear(
        asRegistration({ validFrom: '2025-12-31T23:30:00.000Z' })
      )
    ).toBe(2025)
  })

  it('throws when the registration has no validFrom', () => {
    expect(() => registrationUploadYear(asRegistration({}))).toThrow(
      'Expected validFrom on a registration eligible for upload'
    )
  })
})
