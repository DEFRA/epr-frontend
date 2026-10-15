import { describe, expect, it } from 'vitest'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'

import { registrationIn } from './registration-in-view.js'

/**
 * @import { OrganisationView, RegistrationView } from './organisation-view.js'
 */

const registration = /** @type {RegistrationView} */ ({
  status: 'approved',
  validFrom: '2025-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'exporter',
  accreditations: {
    2026: {
      accreditationNumber: 'A26ER5001180114PL',
      status: 'approved',
      statusTimeline: { '2026-01-01T09:00:00.000Z': { status: 'approved' } }
    }
  }
})

const organisation = /** @type {OrganisationView} */ ({
  organisationNumber: 500001,
  name: 'Kirkby Plastics',
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
