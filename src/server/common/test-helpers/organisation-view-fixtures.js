import {
  ACCREDITATION_STATUS,
  REG_ACC_STATUS,
  REGISTRATION_STATUS
} from '#domain/organisations/model.js'
import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'

/**
 * @import { Accreditation, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
 */

/**
 * @param {Partial<Accreditation>} [overrides]
 * @returns {Accreditation}
 */
export const buildAccreditationView = (overrides = {}) => ({
  accreditationNumber: toAccreditationNumber('A26EN0000000001PL'),
  prns: { open: true },
  status: {
    current: ACCREDITATION_STATUS.APPROVED,
    timeline: [
      { status: ACCREDITATION_STATUS.APPROVED, at: '2026-01-01T00:00:00.000Z' }
    ]
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
      current: REGISTRATION_STATUS.APPROVED,
      timeline: [
        { status: REGISTRATION_STATUS.APPROVED, at: '2026-01-01T00:00:00.000Z' }
      ]
    },
    regAccStatusByDate: {
      2026: { '2026-01-01': { status: REG_ACC_STATUS.ACCREDITED } }
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
  organisationNumber: toOrganisationNumber('500123'),
  name: 'Test Organisation Ltd',
  displayName: 'Test Organisation Ltd',
  registrations: { R26EN0000000001PL: buildRegistrationView() },
  status: { current: 'active' },
  submittedToRegulator: { code: 'ea' },
  ...overrides
})

/**
 * What the registration lookups resolve: an organisation holding the
 * registration, with its live accreditation when it has one.
 * @param {{
 *   registration?: RegistrationView,
 *   accreditation?: Accreditation,
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
