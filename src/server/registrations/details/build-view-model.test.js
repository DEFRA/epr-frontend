import { toStatusTag } from '#server/organisations/helpers/status-helpers.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildViewModel } from './build-view-model.js'

// Only the keys these assertions read are translated. The rendered copy is
// asserted against the real en.json by the page's integration test.
const localise = createMockLocalise({
  'registrations:details:current': 'Current',
  'registrations:details:period': '{{from}} to {{to}}',
  'registrations:details:heading': 'Registration details',
  'registrations:details:allOrganisations': 'All organisations',
  'registrations:details:summary:material': 'Material',
  'registrations:details:summary:overseasSites': 'Overseas reprocessing site',
  'registrations:details:summary:overseasSitesView': 'View',
  'registrations:details:summary:processingType': 'Processing type',
  'registrations:details:summary:site': 'Site',
  'registrations:details:summary:status': 'Status'
})

/**
 * @import { AccreditationView, OrganisationView, RegistrationView, ReprocessorRegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

const keys = {
  organisationNumber: '500118',
  registrationNumber: 'R26ER5001180041PL'
}
const registrationPath = '/organisations/500118/registrations/R26ER5001180041PL'

/** @type {OrganisationView} */
const organisation = {
  organisationNumber: 500118,
  name: 'Kirkby Plastics Ltd',
  registrations: {}
}

/**
 * @param {ReprocessorRegistrationView['site']['address']} address
 * @returns {RegistrationView}
 */
const aReprocessorAt = (address) => ({
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2026-01-01T00:00:00.000Z' }]
  },
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'reprocessor',
  reprocessingType: 'input',
  site: { address },
  accreditations: {}
})

/** @type {RegistrationView} */
const anExporter = {
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2026-01-01T00:00:00.000Z' }]
  },
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'exporter',
  accreditations: {}
}

/**
 * @param {Partial<AccreditationView>} overrides
 * @returns {AccreditationView}
 */
const anAccreditation = (overrides) => ({
  accreditationNumber: 'A26ER5001180114PL',
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2026-07-01T09:00:00.000Z' }]
  },
  ...overrides
})

/**
 * @param {{
 *   registration?: RegistrationView,
 *   organisation?: OrganisationView
 * }} [overrides]
 */
const build = (overrides = {}) =>
  buildViewModel({
    keys,
    organisation: overrides.organisation ?? organisation,
    registration:
      overrides.registration ??
      aReprocessorAt({ line1: 'Unit 4', town: 'Leeds', postcode: 'LS10 1AB' }),
    localise,
    localiseUrl: (path) => path
  })

/**
 * @param {ReturnType<typeof build>} viewModel
 * @param {string} key
 */
const summaryValue = (viewModel, key) => {
  const row = viewModel.summaryRows.find((candidate) => candidate.key === key)

  return row && 'value' in row ? row.value : undefined
}

/**
 * @param {ReturnType<typeof build>} viewModel
 * @param {string} key
 */
const summaryLink = (viewModel, key) => {
  const row = viewModel.summaryRows.find((candidate) => candidate.key === key)

  return row && 'link' in row ? row.link : undefined
}

describe(buildViewModel, () => {
  describe('the summary rows', () => {
    it('show a reprocessor its status, processing type, material and site', () => {
      const viewModel = build({
        registration: aReprocessorAt({
          line1: 'Unit 4 Mill Road',
          line2: 'Hunslet',
          town: 'Leeds',
          county: 'West Yorkshire',
          postcode: 'LS10 1AB'
        })
      })

      expect(viewModel.summaryRows).toStrictEqual([
        { key: 'Status', status: toStatusTag('approved') },
        { key: 'Processing type', value: 'Reprocessor (input)' },
        { key: 'Material', value: 'Plastic' },
        {
          key: 'Site',
          value: 'Unit 4 Mill Road, Hunslet, Leeds, West Yorkshire, LS10 1AB'
        }
      ])
    })

    it('show the address the backend already wrote out', () => {
      const viewModel = build({
        registration: aReprocessorAt({
          fullAddress: 'Unit 4 Mill Road, Leeds LS10 1AB'
        })
      })

      expect(summaryValue(viewModel, 'Site')).toBe(
        'Unit 4 Mill Road, Leeds LS10 1AB'
      )
    })

    it('leave out a part the address holds as blank', () => {
      const viewModel = build({
        registration: aReprocessorAt({
          line1: 'Unit 4 Mill Road',
          line2: '   ',
          town: 'Leeds',
          postcode: ''
        })
      })

      expect(summaryValue(viewModel, 'Site')).toBe('Unit 4 Mill Road, Leeds')
    })

    it('show the material the registration resolved to', () => {
      const viewModel = build({
        registration: {
          ...aReprocessorAt({ fullAddress: 'Leeds' }),
          material: 'glass_re_melt'
        }
      })

      expect(summaryValue(viewModel, 'Material')).toBe('Glass remelt')
    })

    it('show an exporter no site, and open the overseas sites it sends to', () => {
      const viewModel = build({ registration: anExporter })

      expect(viewModel.summaryRows).toStrictEqual([
        { key: 'Status', status: toStatusTag('approved') },
        { key: 'Processing type', value: 'Exporter' },
        { key: 'Material', value: 'Plastic' },
        {
          key: 'Overseas reprocessing site',
          link: { href: `${registrationPath}/overseas-sites`, text: 'View' }
        }
      ])
    })

    it('offer a reprocessor no overseas sites', () => {
      expect(summaryLink(build(), 'Overseas reprocessing site')).toBeUndefined()
    })
  })

  describe('the accredited periods', () => {
    it('list one row per year, newest first, each opening its year', () => {
      const viewModel = build({
        registration: {
          ...anExporter,
          validFrom: '2025-01-01',
          accreditations: {
            2025: anAccreditation({
              accreditationNumber: 'A25ER5001180114PL',
              status: {
                current: 'approved',
                timeline: [
                  { status: 'approved', at: '2025-03-01T09:00:00.000Z' }
                ]
              }
            }),
            2026: anAccreditation({})
          }
        }
      })

      expect(viewModel.accreditedPeriods).toStrictEqual([
        {
          number: 'A26ER5001180114PL',
          dateRange: '1 July to 31 December 2026',
          status: toStatusTag('approved'),
          href: `${registrationPath}/accreditations/2026`
        },
        {
          number: 'A25ER5001180114PL',
          dateRange: '1 March to 31 December 2025',
          status: toStatusTag('approved'),
          href: `${registrationPath}/accreditations/2025`
        }
      ])
    })

    it('start on 1 January for an accreditation approved the year before', () => {
      const viewModel = build({
        registration: {
          ...anExporter,
          accreditations: {
            2026: anAccreditation({
              status: {
                current: 'approved',
                timeline: [
                  { status: 'approved', at: '2025-12-15T09:00:00.000Z' }
                ]
              }
            })
          }
        }
      })

      expect(viewModel.accreditedPeriods[0]?.dateRange).toBe(
        '1 January to 31 December 2026'
      )
    })

    it('end on the cancellation date for a cancelled accreditation', () => {
      const viewModel = build({
        registration: {
          ...anExporter,
          accreditations: {
            2026: anAccreditation({
              status: {
                current: 'cancelled',
                timeline: [
                  { status: 'approved', at: '2026-02-15T09:00:00.000Z' },
                  { status: 'cancelled', at: '2026-03-31T09:00:00.000Z' }
                ]
              }
            })
          }
        }
      })

      expect(viewModel.accreditedPeriods).toStrictEqual([
        {
          number: 'A26ER5001180114PL',
          dateRange: '15 February to 31 March 2026',
          status: toStatusTag('cancelled'),
          href: `${registrationPath}/accreditations/2026`
        }
      ])
    })

    it('are none for a registration holding no accreditation', () => {
      expect(build().accreditedPeriods).toStrictEqual([])
    })
  })

  describe('registered-only periods', () => {
    // The clock decides how many years a live registration has run over, so it
    // is pinned rather than read.
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('offer a year per year the registration has run, most recent first', () => {
      const viewModel = build({
        registration: {
          ...anExporter,
          status: {
            current: 'approved',
            timeline: [{ status: 'approved', at: '2024-06-01T00:00:00.000Z' }]
          }
        }
      })

      expect(viewModel.registeredOnlyPeriods).toStrictEqual([
        {
          year: '2026',
          href: `${registrationPath}/registered-only-periods/2026`
        },
        {
          year: '2025',
          href: `${registrationPath}/registered-only-periods/2025`
        },
        {
          year: '2024',
          href: `${registrationPath}/registered-only-periods/2024`
        }
      ])
    })

    it('offer a year the registration held an accreditation for throughout', () => {
      const viewModel = build({
        registration: {
          ...anExporter,
          accreditations: {
            2026: anAccreditation({
              status: {
                current: 'approved',
                timeline: [
                  { status: 'approved', at: '2026-01-01T09:00:00.000Z' }
                ]
              }
            })
          }
        }
      })

      expect(
        viewModel.registeredOnlyPeriods.map(({ year }) => year)
      ).toStrictEqual(['2026'])
    })

    it('stop at the year the registration was cancelled in', () => {
      const viewModel = build({
        registration: {
          ...anExporter,
          status: {
            current: 'cancelled',
            timeline: [
              { status: 'approved', at: '2025-01-01T00:00:00.000Z' },
              { status: 'cancelled', at: '2025-06-01T09:00:00.000Z' }
            ]
          }
        }
      })

      expect(
        viewModel.registeredOnlyPeriods.map(({ year }) => year)
      ).toStrictEqual(['2025'])
    })
  })

  describe('the organisation', () => {
    it('is named by its trading name where it holds one', () => {
      const viewModel = build({
        organisation: { ...organisation, tradingName: 'Kirkby Recycling' }
      })

      expect(viewModel.caption).toBe('Kirkby Recycling - R26ER5001180041PL')
    })

    it('is named by its own name where the trading name is blank', () => {
      const viewModel = build({
        organisation: { ...organisation, tradingName: '  ' }
      })

      expect(viewModel.caption).toBe('Kirkby Plastics Ltd - R26ER5001180041PL')
    })
  })

  it('walks back to the organisation by number', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      { text: 'Kirkby Plastics Ltd', href: '/organisations/500118' },
      { text: 'Registration details' }
    ])
  })

  it('titles the page by the registration number', () => {
    expect(build().pageTitle).toBe('R26ER5001180041PL: Registration details')
  })
})
