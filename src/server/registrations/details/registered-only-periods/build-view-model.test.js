import { createMockLocalise } from '#server/test-helpers/localise.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { AccreditationResource } from '../helpers/types.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
 */

const localise = createMockLocalise({
  'registrations:details:allOrganisations': 'All organisations',
  'registrations:details:heading': 'Registration details',
  'registrations:details:registeredOnlyPeriod:heading':
    '{{year}} Registered-only periods',
  'registrations:details:registeredOnlyPeriod:breadcrumb':
    '{{year}} Registered-only periods'
})

const organisationId = '6507f1f77bcf86cd79943901'

/**
 * @param {Partial<Organisation['companyDetails']>} [companyDetails]
 * @returns {Organisation}
 */
const anOrganisation = (companyDetails) =>
  /** @type {Organisation} */ (
    /** @type {unknown} */ ({
      id: organisationId,
      companyDetails: { name: 'Kirkby Plastics Ltd', ...companyDetails }
    })
  )

/**
 * @param {Partial<RegistrationResource>} [overrides]
 * @returns {RegistrationResource}
 */
const aRegistration = (overrides) =>
  /** @type {RegistrationResource} */ ({
    id: 'reg-001',
    organisation: { id: organisationId },
    registrationNumber: 'R26ER5001180041PL',
    status: 'approved',
    material: 'plastic',
    reprocessingType: 'input',
    dateRange: { validFrom: '2026-01-01', validTo: null },
    accreditations: [],
    application: {
      orgName: 'Kirkby Plastics',
      submittedToRegulator: 'ea',
      material: 'plastic',
      wasteProcessingType: 'reprocessor',
      site: null
    },
    ...overrides
  })

/**
 * @param {string | null} validFrom
 * @param {string | null} [validTo]
 * @returns {AccreditationResource}
 */
const anAccreditation = (validFrom, validTo = null) =>
  /** @type {AccreditationResource} */ ({
    id: 'acc-001',
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved',
    reprocessingType: 'input',
    dateRange: { validFrom, validTo },
    application: {
      orgName: 'Kirkby Plastics',
      submittedToRegulator: 'ea',
      material: 'plastic',
      wasteProcessingType: 'reprocessor'
    }
  })

/**
 * @param {{
 *   organisation?: Organisation,
 *   registration?: RegistrationResource,
 *   accreditations?: AccreditationResource[],
 *   year?: number
 * }} [overrides]
 */
const build = ({ organisation, registration, accreditations, year } = {}) =>
  buildViewModel({
    organisation: organisation ?? anOrganisation(),
    registration: registration ?? aRegistration(),
    accreditations: accreditations ?? [],
    year: year ?? 2026,
    localise,
    localiseUrl: (path) => path
  })

describe(buildViewModel, () => {
  // The page runs a year up to today, so the clock decides whether it holds
  // anything.
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('names the year it covers', () => {
    expect(build().heading).toBe('2026 Registered-only periods')
  })

  // The year already identifies the page, so no record number is prefixed.
  it('titles the page by the year alone', () => {
    expect(build().pageTitle).toBe('2026 Registered-only periods')
  })

  it('names the organisation and the registration above the heading', () => {
    expect(build().caption).toBe('Kirkby Plastics Ltd - R26ER5001180041PL')
  })

  it('drops the number from the caption for a registration that holds none', () => {
    expect(
      build({
        registration: aRegistration({ registrationNumber: null })
      }).caption
    ).toBe('Kirkby Plastics Ltd')
  })

  it('names the organisation by its trading name where it holds one', () => {
    expect(
      build({
        organisation: anOrganisation({ tradingName: 'Kirkby Recycling' })
      }).caption
    ).toContain('Kirkby Recycling')
  })

  it('walks back to the registration it sits under', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      {
        text: 'Kirkby Plastics Ltd',
        href: `/organisations/${organisationId}`
      },
      {
        text: 'Registration details',
        href: `/organisations/${organisationId}/registrations/reg-001`
      },
      { text: '2026 Registered-only periods' }
    ])
  })

  it('holds data where the year ran without an accreditation', () => {
    expect(build().hasData).toBe(true)
  })

  it('holds data where an accreditation started after the registration', () => {
    expect(
      build({ accreditations: [anAccreditation('2026-03-01')] }).hasData
    ).toBe(true)
  })

  it('holds none where the accreditation ran from the registration start', () => {
    expect(
      build({ accreditations: [anAccreditation('2026-01-01')] }).hasData
    ).toBe(false)
  })
})
