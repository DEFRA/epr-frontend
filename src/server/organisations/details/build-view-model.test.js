import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

const localise = createMockLocalise({
  'organisations:details:allOrganisations': 'All organisations',
  'organisations:details:heading': 'Organisation homepage',
  'organisations:details:table:notApplicable': 'Not applicable',
  'organisations:details:table:unknownSite': 'Unknown site'
})

const localiseUrl = (/** @type {string} */ path) => `/en${path}`

/**
 * @import {
 *   AccreditationLink,
 *   RegistrationResource
 * } from '#server/common/helpers/organisations/registration-resource.js'
 */

const organisationId = '6507f1f77bcf86cd79943901'

/**
 * @param {{
 *   application?: Partial<RegistrationResource['application']>
 * } & Partial<Omit<RegistrationResource, 'application'>>} [overrides]
 * @returns {RegistrationResource}
 */
const aRegistration = ({ application, ...overrides } = {}) => ({
  id: 'reg-001',
  organisation: { id: organisationId },
  registrationNumber: 'R26ER5001180041PL',
  status: 'approved',
  material: 'plastic',
  reprocessingType: 'input',
  dateRange: { validFrom: null },
  accreditations: [],
  application: {
    orgName: 'Kirkby Plastics',
    submittedToRegulator: 'ea',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    site: { address: { line1: 'Site name A' } },
    ...application
  },
  ...overrides
})

/**
 * @param {Partial<AccreditationLink>} [overrides]
 * @returns {AccreditationLink}
 */
const anAccreditation = (overrides) => ({
  id: 'acc-001',
  accreditationNumber: 'A26ER5001180114PL',
  status: 'approved',
  ...overrides
})

/**
 * @param {{
 *   registrations?: RegistrationResource[],
 *   companyDetails?: { name: string },
 *   activeTab?: 'REPROCESSOR' | 'EXPORTER'
 * }} [overrides]
 */
const build = ({
  registrations = [aRegistration()],
  companyDetails = { name: 'Kirkby Plastics Ltd' },
  activeTab = 'REPROCESSOR'
} = {}) =>
  buildViewModel({
    organisation: { id: organisationId, companyDetails },
    registrations,
    activeTab,
    localise,
    localiseUrl
  })

/**
 * @param {ReturnType<typeof build>} viewModel
 */
const firstRow = (viewModel) => {
  const row = viewModel.siteTables[0]?.registrations[0]

  if (!row) {
    throw new Error('expected a registration in the first site table')
  }

  return row
}

describe(buildViewModel, () => {
  it('names the organisation in the caption', () => {
    expect(build().caption).toBe('Kirkby Plastics Ltd')
  })

  it('walks back to the organisation list', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/en/regulators/home' },
      { text: 'Kirkby Plastics Ltd' }
    ])
  })

  it('links each registration to its own page', () => {
    expect(firstRow(build()).href).toBe(
      `/en/organisations/${organisationId}/registrations/reg-001`
    )
  })

  it('shows the registration number, material and regulator', () => {
    expect(firstRow(build())).toMatchObject({
      number: 'R26ER5001180041PL',
      material: 'Plastic',
      regulator: 'EA'
    })
  })

  it('tags the registration status', () => {
    expect(firstRow(build()).status).toStrictEqual({
      text: 'Approved',
      classes: 'govuk-tag--green'
    })
  })

  it('tags each accreditation the registration holds', () => {
    const model = build({
      registrations: [
        aRegistration({
          accreditations: [anAccreditation({ status: 'rejected' })]
        })
      ]
    })

    expect(firstRow(model).accreditations).toStrictEqual([
      { text: 'Rejected', classes: 'govuk-tag--orange' }
    ])
  })

  it('tags every accreditation rather than choosing between them', () => {
    const model = build({
      registrations: [
        aRegistration({
          accreditations: [
            anAccreditation({ id: 'acc-001' }),
            anAccreditation({ id: 'acc-002', status: 'suspended' })
          ]
        })
      ]
    })

    expect(
      firstRow(model).accreditations.map(({ text }) => text)
    ).toStrictEqual(['Approved', 'Suspended'])
  })

  it('tags none where the registration holds none', () => {
    expect(firstRow(build()).accreditations).toStrictEqual([])
  })

  it('leaves the number unset on a registration that never earned one', () => {
    const model = build({
      registrations: [
        aRegistration({ status: 'created', registrationNumber: null })
      ]
    })

    expect(firstRow(model).number).toBeNull()
  })

  it('keeps a rejected registration and a rejected accreditation', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-001', status: 'approved' }),
        aRegistration({ id: 'reg-002', status: 'rejected' })
      ]
    })

    expect(
      model.siteTables[0]?.registrations.map(({ id }) => id)
    ).toStrictEqual(['reg-001', 'reg-002'])
  })

  it('keeps the order the collection answered in', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-002', registrationNumber: null }),
        aRegistration({ id: 'reg-001' })
      ]
    })

    expect(
      model.siteTables[0]?.registrations.map(({ id }) => id)
    ).toStrictEqual(['reg-002', 'reg-001'])
  })

  it('groups registrations under the site they are processed at', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-001' }),
        aRegistration({
          id: 'reg-002',
          application: { site: { address: { line1: 'Site name B' } } }
        }),
        aRegistration({ id: 'reg-003' })
      ]
    })

    expect(
      model.siteTables.map(({ name, registrations }) => [
        name,
        registrations.map(({ id }) => id)
      ])
    ).toStrictEqual([
      ['Site name A', ['reg-001', 'reg-003']],
      ['Site name B', ['reg-002']]
    ])
  })

  it('names a reprocessing site the record gives no address for', () => {
    const model = build({
      registrations: [aRegistration({ application: { site: null } })]
    })

    expect(model.siteTables[0]?.name).toBe('Unknown site')
  })

  it('gives an exporter no site heading, because it reprocesses nowhere', () => {
    const model = build({
      registrations: [
        aRegistration({ application: { wasteProcessingType: 'exporter' } })
      ],
      activeTab: 'EXPORTER'
    })

    expect(model.siteTables[0]?.name).toBeNull()
  })

  it('shows only the registrations of the tab being read', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-001' }),
        aRegistration({
          id: 'reg-002',
          application: { wasteProcessingType: 'exporter' }
        })
      ],
      activeTab: 'EXPORTER'
    })

    expect(
      model.siteTables.flatMap(({ registrations }) =>
        registrations.map(({ id }) => id)
      )
    ).toStrictEqual(['reg-002'])
  })

  it('offers both tabs when the organisation does both', () => {
    const model = build({
      registrations: [
        aRegistration({ id: 'reg-001' }),
        aRegistration({
          id: 'reg-002',
          application: { wasteProcessingType: 'exporter' }
        })
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

  it('shows a reprocessor-only organisation what it has', () => {
    const model = build({ activeTab: 'EXPORTER' })

    expect(model).toMatchObject({
      activeTab: 'REPROCESSOR',
      shouldRenderTabs: false,
      siteTables: [{ registrations: [{ id: 'reg-001' }] }]
    })
  })

  it('shows an exporter-only organisation what it has', () => {
    const model = build({
      registrations: [
        aRegistration({
          id: 'reg-002',
          application: { wasteProcessingType: 'exporter' }
        })
      ],
      activeTab: 'REPROCESSOR'
    })

    expect(model).toMatchObject({
      activeTab: 'EXPORTER',
      shouldRenderTabs: false,
      siteTables: [{ registrations: [{ id: 'reg-002' }] }]
    })
  })

  it('says an organisation holding nothing has no site tables', () => {
    expect(build({ registrations: [] })).toMatchObject({
      shouldRenderTabs: false,
      siteTables: []
    })
  })

  it('leaves the tab alone where there is nothing to move the reader to', () => {
    expect(
      build({ registrations: [], activeTab: 'REPROCESSOR' }).activeTab
    ).toBe('REPROCESSOR')
  })

  it('names a numbered registration by its number in the link', () => {
    expect(firstRow(build()).linkName).toBe('R26ER5001180041PL')
  })

  it('names a numberless registration by what its row shows', () => {
    const model = build({
      registrations: [
        aRegistration({
          status: 'created',
          registrationNumber: null,
          material: 'aluminium'
        })
      ]
    })

    expect(firstRow(model).linkName).toBe('Aluminium, Created')
  })

  it('reads the material the registration resolved to', () => {
    const model = build({
      registrations: [
        aRegistration({
          material: 'glass_re_melt',
          application: { material: 'glass' }
        })
      ]
    })

    expect(firstRow(model).material).toBe('Glass remelt')
  })

  it('reads what was applied for where nothing resolved', () => {
    const { material: _material, ...unresolved } = aRegistration({
      application: { material: 'glass' }
    })
    const model = build({ registrations: [unresolved] })

    expect(firstRow(model).material).toBe('Glass')
  })
})
