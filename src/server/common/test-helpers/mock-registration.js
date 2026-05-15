/**
 * @import { Organisation, User } from '#domain/organisations/model.js'
 * @import { Registration, RegistrationApproved } from '#domain/organisations/registration.js'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 */

/** @type {User} */
const stubUser = {
  fullName: 'Test User',
  email: 'test@example.com',
  phone: '01onal 123456'
}

/** @type {RegistrationApproved} */
const baseRegistration = {
  id: 'reg-001',
  approvedPersons: [],
  formSubmissionTime: new Date('2026-01-01'),
  material: 'plastic',
  orgName: 'Test Organisation',
  site: {
    address: {},
    gridReference: 'SJ 000 000',
    siteCapacity: []
  },
  submittedToRegulator: 'ea',
  submitterContactDetails: stubUser,
  wasteProcessingType: 'exporter',
  registrationNumber: 'REG001234',
  status: 'approved',
  validFrom: '2026-01-01',
  validTo: '2027-01-01'
}

/** @type {Organisation} */
const baseOrganisation = {
  id: 'org-123',
  accreditations: [],
  companyDetails: { name: 'Test Organisation' },
  formSubmissionTime: new Date('2026-01-01'),
  orgId: 1,
  registrations: [],
  schemaVersion: 1,
  status: 'approved',
  statusHistory: [],
  submittedToRegulator: 'ea',
  submitterContactDetails: stubUser,
  users: [],
  version: 1,
  wasteProcessingTypes: ['exporter']
}

/**
 * Build a typed RegistrationWithAccreditation from partial overrides.
 * @param {{ organisationData?: Partial<Organisation>, registration?: Partial<Registration>, accreditation?: object }} [overrides]
 * @returns {RegistrationWithAccreditation}
 */
export function buildRegistration(overrides = {}) {
  return {
    organisationData: { ...baseOrganisation, ...overrides.organisationData },
    registration: /** @type {RegistrationApproved} */ ({
      ...baseRegistration,
      ...overrides.registration
    }),
    accreditation: overrides.accreditation
  }
}
