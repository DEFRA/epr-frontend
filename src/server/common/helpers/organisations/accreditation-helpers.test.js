import { describe, expect, it } from 'vitest'
import {
  isAccreditationActive,
  isAccreditationViewActive
} from './accreditation-helpers.js'

/** @import { Accreditation } from '#domain/organisations/accreditation.js' */
/** @import { AccreditationStatus } from '#domain/organisations/model.js' */

const BASE = {
  id: 'acc-1',
  statusHistory: [],
  formSubmissionTime: '2024-01-01T00:00:00.000Z',
  material: 'plastic',
  prnIssuance: {
    incomeBusinessPlan: [],
    signatories: [],
    tonnageBand: 'small'
  },
  submittedToRegulator: 'ea',
  submitterContactDetails: {
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '01234567890'
  },
  wasteProcessingType: 'reprocessor'
}

/** @type {Accreditation} */
const APPROVED = {
  ...BASE,
  status: 'approved',
  accreditationNumber: 'ACC-001',
  validFrom: '2024-01-01',
  validTo: '2024-12-31'
}

/** @type {Accreditation} */
const SUSPENDED = {
  ...BASE,
  status: 'suspended',
  accreditationNumber: 'ACC-001',
  validFrom: '2024-01-01',
  validTo: '2024-12-31'
}

/** @type {Accreditation} */
const CREATED = { ...BASE, status: 'created' }

/** @type {Accreditation} */
const REJECTED = { ...BASE, status: 'rejected' }

/** @type {Accreditation} */
const CANCELLED = { ...BASE, status: 'cancelled' }

describe(isAccreditationActive, () => {
  it.each([
    { label: 'approved', accreditation: APPROVED, expected: true },
    { label: 'suspended', accreditation: SUSPENDED, expected: true },
    { label: 'created', accreditation: CREATED, expected: false },
    { label: 'rejected', accreditation: REJECTED, expected: false },
    { label: 'cancelled', accreditation: CANCELLED, expected: false }
  ])(
    'returns $expected for $label accreditation',
    ({ accreditation, expected }) => {
      expect(isAccreditationActive(accreditation)).toBe(expected)
    }
  )

  it('returns false for undefined', () => {
    expect(isAccreditationActive(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isAccreditationActive(null)).toBe(false)
  })
})

describe(isAccreditationViewActive, () => {
  it.each([
    { current: 'approved', expected: true },
    { current: 'suspended', expected: true },
    { current: 'created', expected: false },
    { current: 'rejected', expected: false },
    { current: 'cancelled', expected: false }
  ])(
    'returns $expected for $current accreditation',
    ({ current, expected }) => {
      const accreditation = {
        accreditationNumber: 'ACC-001',
        status: {
          current: /** @type {AccreditationStatus} */ (current),
          timeline: {}
        }
      }

      expect(isAccreditationViewActive(accreditation)).toBe(expected)
    }
  )

  it('returns false for a year with no accreditation', () => {
    expect(isAccreditationViewActive(undefined)).toBe(false)
  })
})
