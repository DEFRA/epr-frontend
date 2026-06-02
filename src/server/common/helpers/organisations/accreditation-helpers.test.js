import { describe, expect, it } from 'vitest'
import { isAccreditationActive } from './accreditation-helpers.js'

/** @import { Accreditation } from '#domain/organisations/accreditation.js' */

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
const ARCHIVED = { ...BASE, status: 'archived' }

describe(isAccreditationActive, () => {
  it.each([
    { label: 'approved', accreditation: APPROVED, expected: true },
    { label: 'suspended', accreditation: SUSPENDED, expected: true },
    { label: 'created', accreditation: CREATED, expected: false },
    { label: 'rejected', accreditation: REJECTED, expected: false },
    { label: 'archived', accreditation: ARCHIVED, expected: false }
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
