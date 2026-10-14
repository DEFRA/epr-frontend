import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/** @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js' */

const localise = createMockLocalise({
  'organisations:details:allOrganisations': 'All organisations',
  'organisations:details:heading': 'Organisation homepage'
})

const localiseUrl = (/** @type {string} */ path) => `/en${path}`

const organisationNumber = 500123

/**
 * @param {Partial<RegistrationView>} [overrides]
 * @returns {RegistrationView}
 */
const aReprocessor = (overrides = {}) =>
  /** @type {RegistrationView} */ ({
    status: 'approved',
    material: 'plastic',
    submittedToRegulator: { code: 'ea' },
    wasteProcessingType: 'reprocessor',
    site: { address: { line1: 'Site name A' } },
    accreditations: {},
    ...overrides
  })

/**
 * @param {Partial<RegistrationView>} [overrides]
 * @returns {RegistrationView}
 */
const anExporter = (overrides = {}) =>
  /** @type {RegistrationView} */ ({
    status: 'approved',
    material: 'paper',
    submittedToRegulator: { code: 'ea' },
    wasteProcessingType: 'exporter',
    accreditations: {},
    ...overrides
  })

/**
 * @param {{
 *   registrations?: Record<string, RegistrationView>,
 *   activeTab?: 'REPROCESSOR' | 'EXPORTER'
 * }} [overrides]
 */
const build = ({
  registrations = { R26ER1: aReprocessor() },
  activeTab = 'REPROCESSOR'
} = {}) =>
  buildViewModel({
    organisation: {
      organisationNumber,
      name: 'Kirkby Plastics Ltd',
      registrations
    },
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

/**
 * @param {ReturnType<typeof build>} viewModel
 */
const numbersOf = (viewModel) =>
  viewModel.siteTables.flatMap(({ registrations }) =>
    registrations.map(({ number }) => number)
  )

describe(buildViewModel, () => {
  it('names the organisation in the caption and title', () => {
    expect(build()).toMatchObject({
      caption: 'Kirkby Plastics Ltd',
      pageTitle: 'Kirkby Plastics Ltd: Organisation homepage'
    })
  })

  it('walks back to the organisation list', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/en/regulators/home' },
      { text: 'Kirkby Plastics Ltd' }
    ])
  })

  it('links each registration to its own page by number', () => {
    expect(firstRow(build()).href).toBe(
      `/en/organisations/${organisationNumber}/registrations/R26ER1`
    )
  })

  it('shows the registration number, material and regulator', () => {
    expect(firstRow(build())).toMatchObject({
      number: 'R26ER1',
      material: 'Plastic',
      regulator: 'EA'
    })
  })

  it('shows a resolved glass material by its process', () => {
    const model = build({
      registrations: { R26ER1: aReprocessor({ material: 'glass_re_melt' }) }
    })

    expect(firstRow(model).material).toBe('Glass remelt')
  })

  it('tags the registration status', () => {
    expect(firstRow(build()).status).toStrictEqual({
      text: 'Approved',
      classes: 'govuk-tag--green'
    })
  })

  it('tags every year’s accreditation, newest first', () => {
    const model = build({
      registrations: {
        R26ER1: aReprocessor({
          accreditations: {
            2025: {
              accreditationNumber: 'A25ER1',
              status: 'cancelled',
              statusTimeline: {
                '2025-01-01T09:00:00.000Z': { status: 'approved' },
                '2025-06-01T09:00:00.000Z': { status: 'cancelled' }
              }
            },
            2026: {
              accreditationNumber: 'A26ER1',
              status: 'suspended',
              statusTimeline: {
                '2026-01-01T09:00:00.000Z': { status: 'approved' },
                '2026-06-01T09:00:00.000Z': { status: 'suspended' }
              }
            }
          }
        })
      }
    })

    expect(firstRow(model).accreditations).toStrictEqual([
      { text: '2026: Suspended', classes: 'govuk-tag--yellow' },
      { text: '2025: Cancelled', classes: 'govuk-tag--red' }
    ])
  })

  it('tags none where the registration holds none', () => {
    expect(firstRow(build()).accreditations).toStrictEqual([])
  })

  it('keeps the order the organisation lists its registrations in', () => {
    const model = build({
      registrations: { R26ER2: aReprocessor(), R26ER1: aReprocessor() }
    })

    expect(numbersOf(model)).toStrictEqual(['R26ER2', 'R26ER1'])
  })

  it('groups registrations under the site they are processed at', () => {
    const model = build({
      registrations: {
        R26ER1: aReprocessor(),
        R26ER2: aReprocessor({
          site: { address: { fullAddress: 'Site name B, London' } }
        }),
        R26ER3: aReprocessor()
      }
    })

    expect(
      model.siteTables.map(({ name, registrations }) => [
        name,
        registrations.map(({ number }) => number)
      ])
    ).toStrictEqual([
      ['Site name A', ['R26ER1', 'R26ER3']],
      ['Site name B, London', ['R26ER2']]
    ])
  })

  it('gives an exporter no site heading, because it reprocesses nowhere', () => {
    const model = build({
      registrations: { R26EX1: anExporter() },
      activeTab: 'EXPORTER'
    })

    expect(model.siteTables[0]?.name).toBeNull()
  })

  it('shows only the registrations of the tab being read', () => {
    const model = build({
      registrations: { R26ER1: aReprocessor(), R26EX1: anExporter() },
      activeTab: 'EXPORTER'
    })

    expect(numbersOf(model)).toStrictEqual(['R26EX1'])
  })

  it('offers both tabs by number when the organisation does both', () => {
    const model = build({
      registrations: { R26ER1: aReprocessor(), R26EX1: anExporter() }
    })

    expect(model).toMatchObject({
      shouldRenderTabs: true,
      reprocessorUrl: `/en/organisations/${organisationNumber}`,
      exporterUrl: `/en/organisations/${organisationNumber}/exporting`
    })
  })

  it('offers no tabs when the organisation only reprocesses', () => {
    expect(build().shouldRenderTabs).toBe(false)
  })

  it('shows a reprocessor-only organisation what it has', () => {
    const model = build({ activeTab: 'EXPORTER' })

    expect(model).toMatchObject({
      activeTab: 'REPROCESSOR',
      shouldRenderTabs: false
    })
    expect(numbersOf(model)).toStrictEqual(['R26ER1'])
  })

  it('shows an exporter-only organisation what it has', () => {
    const model = build({
      registrations: { R26EX1: anExporter() },
      activeTab: 'REPROCESSOR'
    })

    expect(model).toMatchObject({
      activeTab: 'EXPORTER',
      shouldRenderTabs: false
    })
    expect(numbersOf(model)).toStrictEqual(['R26EX1'])
  })

  it('says an organisation holding nothing has no site tables', () => {
    expect(build({ registrations: {} })).toMatchObject({
      shouldRenderTabs: false,
      siteTables: []
    })
  })

  it('leaves the tab alone where there is nothing to move the reader to', () => {
    expect(build({ registrations: {}, activeTab: 'EXPORTER' }).activeTab).toBe(
      'EXPORTER'
    )
  })
})
