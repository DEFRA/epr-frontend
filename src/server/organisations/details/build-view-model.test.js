/** @import { RegistrationSite } from '#domain/organisations/registration.js'; */
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

// Only the keys these assertions read are translated. The rendered copy is
// asserted against the real en.json by the page's integration test.
const localise = createMockLocalise({
  'organisations:details:allOrganisations': 'All organisations',
  'organisations:details:heading': 'Organisation homepage',
  'organisations:details:table:notApplicable': 'Not applicable',
  'organisations:details:table:unknownSite': 'Unknown site'
})

const localiseUrl = (/** @type {string} */ path) => `/en${path}`

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 */

const organisationId = '6507f1f77bcf86cd79943901'

/**
 * @param {string} line1
 * @returns {RegistrationSite}
 */
const aSiteAt = (line1) => ({
  address: { line1 },
  gridReference: 'SE 29845 30826',
  siteCapacity: []
})

/**
 * @param {Partial<Registration>} overrides
 * @returns {Registration}
 */
const aRegistration = (overrides) =>
  /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: 'reg-001',
      registrationNumber: 'R26ER5001180041PL',
      status: 'approved',
      material: 'plastic',
      submittedToRegulator: 'ea',
      wasteProcessingType: 'reprocessor',
      site: aSiteAt('Site name A'),
      ...overrides
    })
  )

/**
 * @param {Partial<Accreditation>} overrides
 * @returns {Accreditation}
 */
const anAccreditation = (overrides) =>
  /** @type {Accreditation} */ (
    /** @type {unknown} */ ({
      id: 'acc-001',
      status: 'approved',
      ...overrides
    })
  )

/**
 * @param {{
 *   registrations?: Registration[],
 *   accreditations?: Accreditation[],
 *   companyDetails?: { name: string, tradingName?: string },
 *   activeTab?: 'REPROCESSOR' | 'EXPORTER'
 * }} [overrides]
 */
const build = ({
  registrations = [aRegistration({})],
  accreditations = [],
  companyDetails = { name: 'Kirkby Plastics Ltd' },
  activeTab = 'REPROCESSOR'
} = {}) =>
  buildViewModel({
    organisation: /** @type {Organisation} */ (
      /** @type {unknown} */ ({
        id: organisationId,
        companyDetails,
        registrations,
        accreditations
      })
    ),
    activeTab,
    localise,
    localiseUrl
  })

describe(buildViewModel, () => {
  it('names the organisation in the caption', () => {
    expect(build().caption).toBe('Kirkby Plastics Ltd')
  })

  it('prefers the trading name the organisation is known by', () => {
    const model = build({
      companyDetails: { name: 'Kirkby Plastics Ltd', tradingName: 'Kirkby' }
    })

    expect(model.caption).toBe('Kirkby')
  })

  it('walks back to the organisation list', () => {
    expect(build().breadcrumbs).toEqual([
      { text: 'All organisations', href: '/en/regulators/home' },
      { text: 'Kirkby Plastics Ltd' }
    ])
  })

  it('links each registration to its own page', () => {
    const [site] = build().siteTables

    expect(site.registrations[0].href).toBe(
      `/en/organisations/${organisationId}/registrations/reg-001`
    )
  })

  it('shows the registration number, material and regulator', () => {
    const [{ registrations }] = build().siteTables

    expect(registrations[0]).toMatchObject({
      number: 'R26ER5001180041PL',
      material: 'Plastic',
      regulator: 'EA'
    })
  })

  it('tags the registration status', () => {
    const [{ registrations }] = build().siteTables

    expect(registrations[0].status).toEqual({
      text: 'Approved',
      classes: 'govuk-tag--green'
    })
  })

  it('tags the accreditation the registration is on', () => {
    const model = build({
      registrations: [aRegistration({ accreditationId: 'acc-001' })],
      accreditations: [anAccreditation({ status: 'rejected' })]
    })

    expect(model.siteTables[0].registrations[0].accreditation).toEqual({
      text: 'Rejected',
      classes: 'govuk-tag--orange'
    })
  })

  it('leaves the accreditation unset when the registration is on none', () => {
    const [{ registrations }] = build().siteTables

    expect(registrations[0].accreditation).toBeNull()
  })

  it('leaves the number unset on a registration that never earned one', () => {
    const model = build({
      registrations: [
        aRegistration({ status: 'created', registrationNumber: undefined })
      ]
    })

    expect(model.siteTables[0].registrations[0].number).toBeNull()
  })

  // The operator's own page hides these, because the operator can act on
  // neither. A regulator is reading the record, so the record is what it shows.
  it('keeps a rejected registration and a rejected accreditation', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-001', status: 'approved' }),
        aRegistration({ id: 'reg-002', status: 'rejected' })
      ]
    })

    expect(model.siteTables[0].registrations.map(({ id }) => id)).toEqual([
      'reg-001',
      'reg-002'
    ])
  })

  it('groups registrations under the site they are processed at', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-001' }),
        aRegistration({
          id: 'reg-002',
          site: aSiteAt('Site name B')
        }),
        aRegistration({ id: 'reg-003' })
      ]
    })

    expect(
      model.siteTables.map(({ name, registrations }) => [
        name,
        registrations.map(({ id }) => id)
      ])
    ).toEqual([
      ['Site name A', ['reg-001', 'reg-003']],
      ['Site name B', ['reg-002']]
    ])
  })

  it('names a reprocessing site the record gives no address for', () => {
    const model = build({
      registrations: [aRegistration({ site: undefined })]
    })

    expect(model.siteTables[0].name).toBe('Unknown site')
  })

  it('gives an exporter no site heading, because it reprocesses nowhere', () => {
    const model = build({
      registrations: [aRegistration({ wasteProcessingType: 'exporter' })],
      activeTab: 'EXPORTER'
    })

    expect(model.siteTables[0].name).toBeNull()
  })

  it('shows only the registrations of the tab being read', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-001', wasteProcessingType: 'reprocessor' }),
        aRegistration({ id: 'reg-002', wasteProcessingType: 'exporter' })
      ],
      activeTab: 'EXPORTER'
    })

    expect(
      model.siteTables.flatMap(({ registrations }) =>
        registrations.map(({ id }) => id)
      )
    ).toEqual(['reg-002'])
  })

  it('offers both tabs when the organisation does both', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-001', wasteProcessingType: 'reprocessor' }),
        aRegistration({ id: 'reg-002', wasteProcessingType: 'exporter' })
      ]
    })

    expect(model).toMatchObject({
      shouldRenderTabs: true,
      reprocessorUrl: `/en/organisations/${organisationId}`,
      exporterUrl: `/en/organisations/${organisationId}/exporting`
    })
  })

  it('offers no tabs when the organisation only reprocesses', () => {
    expect(build().shouldRenderTabs).toBe(false)
  })
})
