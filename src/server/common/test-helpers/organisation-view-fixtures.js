/**
 * @import { AccreditationView, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
 */

/**
 * @param {Partial<AccreditationView>} [overrides]
 * @returns {AccreditationView}
 */
export const buildAccreditationView = (overrides = {}) => ({
  accreditationNumber: 'A26EN0000000001PL',
  status: {
    current: 'approved',
    timeline: { '2026-01-01T00:00:00.000Z': { status: 'approved' } }
  },
  ...overrides
})

/**
 * An exporter by default; pass `wasteProcessingType: 'reprocessor'` with
 * `reprocessingType` and `site` for a reprocessor.
 * @param {Partial<RegistrationView>} [overrides]
 * @returns {RegistrationView}
 */
export const buildRegistrationView = (overrides = {}) =>
  /** @type {RegistrationView} */ ({
    status: {
      current: 'approved',
      timeline: { '2026-01-01T00:00:00.000Z': { status: 'approved' } }
    },
    validFrom: '2026-01-01',
    material: 'plastic',
    submittedToRegulator: { code: 'ea' },
    wasteProcessingType: 'exporter',
    accreditations: { 2026: buildAccreditationView() },
    ...overrides
  })

/**
 * @param {Partial<OrganisationView>} [overrides]
 * @returns {OrganisationView}
 */
export const buildOrganisationView = (overrides = {}) => ({
  organisationNumber: 500123,
  name: 'Test Organisation Ltd',
  displayName: 'Test Organisation Ltd',
  registrations: { R26EN0000000001PL: buildRegistrationView() },
  ...overrides
})

/**
 * What the registration lookups resolve: an organisation holding the
 * registration, with its live accreditation when it has one.
 * @param {{
 *   registration?: RegistrationView,
 *   accreditation?: AccreditationView,
 *   organisation?: Partial<OrganisationView>,
 *   registrationNumber?: string
 * }} [parts]
 * @returns {Required<RegistrationWithAccreditation>}
 */
export const buildRegistrationWithAccreditation = ({
  registration = buildRegistrationView(),
  accreditation = registration.accreditations['2026'],
  organisation = {},
  registrationNumber = 'R26EN0000000001PL'
} = {}) => ({
  organisation: buildOrganisationView({
    registrations: { [registrationNumber]: registration },
    ...organisation
  }),
  registration,
  accreditation
})

/**
 * Casts a partial fixture to what the registration lookups resolve, for tests
 * that supply only the fields the code under test reads.
 * @param {unknown} data
 * @returns {Required<RegistrationWithAccreditation>}
 */
export const asRegistrationWithAccreditation = (data) =>
  /** @type {Required<RegistrationWithAccreditation>} */ (data)
