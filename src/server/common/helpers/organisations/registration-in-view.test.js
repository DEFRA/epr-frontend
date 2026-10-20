import { describe, expect, it } from 'vitest'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'

import {
  accreditationIn,
  latestAccreditationYear,
  registrationIn
} from './registration-in-view.js'

/**
 * @import { OrganisationView, RegistrationView } from './organisation-view.js'
 */

const accreditation2025 = /** @type {const} */ ({
  accreditationNumber: 'A25ER5001180114PL',
  status: {
    current: 'approved',
    timeline: { '2025-01-01T09:00:00.000Z': { status: 'approved' } }
  }
})

const accreditation2026 = /** @type {const} */ ({
  accreditationNumber: 'A26ER5001180114PL',
  status: {
    current: 'approved',
    timeline: { '2026-01-01T09:00:00.000Z': { status: 'approved' } }
  }
})

const registration = /** @type {RegistrationView} */ ({
  status: {
    current: 'approved',
    timeline: { '2025-01-01T00:00:00.000Z': { status: 'approved' } }
  },
  validFrom: '2025-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'exporter',
  accreditations: { 2026: accreditation2026, 2025: accreditation2025 }
})

const organisation = /** @type {OrganisationView} */ ({
  organisationNumber: 500001,
  name: 'Kirkby Plastics',
  displayName: 'Kirkby Plastics',
  registrations: { R25SR500030912PA: registration }
})

describe(registrationIn, () => {
  it('returns the registration with that number', () => {
    expect(registrationIn(organisation, 'R25SR500030912PA')).toBe(registration)
  })

  it('is a 404 for a number the organisation does not hold', () => {
    expect(() => registrationIn(organisation, 'R99XX')).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: statusCodes.notFound }),
        code: errorCodes.registrationNotFound
      })
    )
  })

  it('is a 404 for an inherited key', () => {
    expect(() => registrationIn(organisation, 'toString')).toThrow(
      expect.objectContaining({ code: errorCodes.registrationNotFound })
    )
  })
})

describe(accreditationIn, () => {
  it('returns the accreditation for that year', () => {
    expect(accreditationIn(registration, '2025')).toBe(accreditation2025)
  })

  it('is a 404 for a year the registration holds no accreditation for', () => {
    expect(() => accreditationIn(registration, '2024')).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: statusCodes.notFound }),
        code: errorCodes.accreditationNotFound
      })
    )
  })

  it('is a 404 for an inherited key', () => {
    expect(() => accreditationIn(registration, 'constructor')).toThrow(
      expect.objectContaining({ code: errorCodes.accreditationNotFound })
    )
  })
})

describe(latestAccreditationYear, () => {
  it('returns the highest year', () => {
    expect(latestAccreditationYear(registration)).toBe('2026')
  })

  it('returns undefined for a registration with no accreditations', () => {
    expect(
      latestAccreditationYear({ ...registration, accreditations: {} })
    ).toBeUndefined()
  })
})
