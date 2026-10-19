import { config } from '#config/config.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { AccreditationView, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { TableRow } from './build-view-model.js'
 */

const localise = createMockLocalise({
  'registrations:details:allOrganisations': 'All organisations',
  'registrations:details:heading': 'Registration details',
  'registrations:details:registeredOnlyPeriod:heading':
    '{{year}} Registered-only periods',
  'registrations:details:registeredOnlyPeriod:breadcrumb':
    '{{year}} Registered-only periods',
  'registrations:details:registeredOnlyPeriod:reports:period': 'Period',
  'registrations:details:registeredOnlyPeriod:reports:dueDate': 'Due date',
  'registrations:details:registeredOnlyPeriod:reports:submissionDate':
    'Submission date',
  'registrations:details:registeredOnlyPeriod:reports:status': 'Status',
  'registrations:details:registeredOnlyPeriod:reports:actions': 'Actions',
  // Read by the shared report helpers rather than by this view model, so the
  // real strings are asserted by the page's integration test.
  'reports:quarterlyPeriod': 'Quarter {{number}}, {{year}}',
  'reports:actionView': 'View'
})

const organisationNumber = '500118'
const registrationNumber = 'R26ER5001180041PL'
const registrationPath = `/organisations/${organisationNumber}/registrations/${registrationNumber}`

/**
 * @param {Partial<OrganisationView>} [overrides]
 * @returns {OrganisationView}
 */
const anOrganisation = (overrides) => ({
  organisationNumber: 500118,
  name: 'Kirkby Plastics Ltd',
  registrations: {},
  ...overrides
})

/**
 * @param {Record<string, string>} timeline - status by ISO datetime
 * @returns {AccreditationView}
 */
const anAccreditation = (timeline) => ({
  accreditationNumber: 'A26ER5001180114PL',
  status: {
    current: 'approved',
    timeline: Object.fromEntries(
      Object.entries(timeline).map(([date, status]) => [date, { status }])
    )
  }
})

/**
 * @param {Record<string, AccreditationView>} [accreditations]
 * @returns {RegistrationView}
 */
const aRegistration = (accreditations = {}) => ({
  status: {
    current: 'approved',
    timeline: { '2026-01-01T00:00:00.000Z': { status: 'approved' } }
  },
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'reprocessor',
  reprocessingType: 'input',
  site: { address: { fullAddress: 'North Road, Leeds' } },
  accreditations
})

/**
 * A registered-only submission, which the backend writes zero-delta.
 * @param {string} [createdAt]
 * @returns {LedgerEvent}
 */
const aLedgerEvent = (createdAt = '2026-05-04T09:00:00.000Z') => ({
  kind: 'summary-log-submitted',
  createdAt,
  summaryLog: { id: 'log-1', creditTotal: 0 },
  balance: {
    opening: { total: 0, available: 0 },
    closing: { total: 0, available: 0 }
  },
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' }
})

/**
 * @param {{
 *   organisation?: OrganisationView,
 *   registration?: RegistrationView,
 *   cadence?: CadenceValue | null,
 *   reportingPeriods?: ReportingPeriod[],
 *   ledgerEvents?: LedgerEvent[] | null,
 *   year?: number
 * }} [overrides]
 */
const build = ({
  organisation,
  registration,
  cadence = 'quarterly',
  reportingPeriods,
  ledgerEvents = null,
  year
} = {}) =>
  buildViewModel({
    organisation: organisation ?? anOrganisation(),
    registration: registration ?? aRegistration(),
    keys: { organisationNumber, registrationNumber },
    cadence,
    reportingPeriods: reportingPeriods ?? [],
    ledgerEvents,
    year: year ?? 2026,
    localise,
    localiseUrl: (path) => path
  })

/**
 * What each cell of one row holds, whether it holds it as text or as markup.
 * @param {TableRow | undefined} row
 * @returns {string[]}
 */
const cellsOf = (row) => {
  if (!row) {
    throw new Error('expected a row')
  }

  return row.map((cell) => ('text' in cell ? cell.text : cell.html))
}

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

  it('names the organisation by its trading name where it holds one', () => {
    expect(
      build({
        organisation: anOrganisation({ tradingName: 'Kirkby Recycling' })
      }).caption
    ).toBe('Kirkby Recycling - R26ER5001180041PL')
  })

  it('names the organisation by its name where the trading name is blank', () => {
    expect(
      build({ organisation: anOrganisation({ tradingName: '  ' }) }).caption
    ).toBe('Kirkby Plastics Ltd - R26ER5001180041PL')
  })

  it('walks back to the registration it sits under, by number', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      {
        text: 'Kirkby Plastics Ltd',
        href: `/organisations/${organisationNumber}`
      },
      { text: 'Registration details', href: registrationPath },
      { text: '2026 Registered-only periods' }
    ])
  })

  it('holds data where the year ran without an accreditation', () => {
    expect(build().hasData).toBe(true)
  })

  it('holds data where an accreditation started after the registration', () => {
    expect(
      build({
        registration: aRegistration({
          2026: anAccreditation({ '2026-03-01T09:00:00.000Z': 'approved' })
        })
      }).hasData
    ).toBe(true)
  })

  it('holds none where the accreditation ran from the registration start', () => {
    expect(
      build({
        registration: aRegistration({
          2026: anAccreditation({ '2026-01-01T09:00:00.000Z': 'approved' })
        })
      }).hasData
    ).toBe(false)
  })

  it('holds data for the gap a cancelled accreditation left', () => {
    expect(
      build({
        registration: aRegistration({
          2026: anAccreditation({
            '2026-01-01T09:00:00.000Z': 'approved',
            '2026-03-10T09:00:00.000Z': 'cancelled',
            '2026-03-30T09:00:00.000Z': 'approved'
          })
        })
      }).hasData
    ).toBe(true)
  })

  it('holds none where the accreditation was only suspended', () => {
    expect(
      build({
        registration: aRegistration({
          2026: anAccreditation({
            '2026-01-01T09:00:00.000Z': 'approved',
            '2026-03-10T09:00:00.000Z': 'suspended'
          })
        })
      }).hasData
    ).toBe(false)
  })

  it('holds none where the registration was cancelled when the accreditation was', () => {
    const cancelledOn = {
      '2026-01-01T09:00:00.000Z': 'approved',
      '2026-03-01T09:00:00.000Z': 'cancelled'
    }

    expect(
      build({
        registration: {
          ...aRegistration({ 2026: anAccreditation(cancelledOn) }),
          status: {
            current: 'cancelled',
            timeline: anAccreditation(cancelledOn).status.timeline
          }
        }
      }).hasData
    ).toBe(false)
  })

  describe('the reports table', () => {
    /**
     * @param {number} period
     * @param {Partial<ReportingPeriod>} [overrides]
     * @returns {ReportingPeriod}
     */
    const aQuarter = (period, overrides = {}) =>
      /** @type {ReportingPeriod} */ ({
        year: 2026,
        period,
        submissionNumber: 1,
        startDate: `2026-${String(period * 3 - 2).padStart(2, '0')}-01`,
        endDate: `2026-${String(period * 3).padStart(2, '0')}-28`,
        dueDate: `2026-${String(period * 3 + 1).padStart(2, '0')}-20`,
        periodStatus: 'submitted',
        report: { submittedAt: '2026-04-15T15:09:00.000Z' },
        ...overrides
      })

    it('names the five columns in the design order', () => {
      const headings = build().reports.head.map((cell) =>
        'text' in cell ? cell.text : ''
      )

      expect(headings).toStrictEqual([
        'Period',
        'Due date',
        'Submission date',
        'Status',
        'Actions'
      ])
    })

    it('shows a quarter the calendar answered with', () => {
      const [row] = build({ reportingPeriods: [aQuarter(1)] }).reports.rows

      expect(row?.[0]).toStrictEqual({ text: 'Quarter 1, 2026' })
      expect(row?.[1]).toStrictEqual({ text: '20 Apr 2026' })
    })

    // The calendar answers one cadence for the registration. Monthly periods
    // are the accreditation page's to show, so they are not repeated here.
    it('shows nothing where the registration currently owes monthly reports', () => {
      expect(
        build({
          cadence: 'monthly',
          reportingPeriods: [aQuarter(1), aQuarter(2)]
        }).reports.rows
      ).toStrictEqual([])
    })

    it('shows nothing where the calendar could not be read', () => {
      expect(
        build({ cadence: null, reportingPeriods: [aQuarter(1)] }).reports.rows
      ).toStrictEqual([])
    })

    it('leads with the most recent quarter', () => {
      const rows = build({
        reportingPeriods: [aQuarter(1), aQuarter(2)]
      }).reports.rows

      expect(rows.map((row) => row[0])).toStrictEqual([
        { text: 'Quarter 2, 2026' },
        { text: 'Quarter 1, 2026' }
      ])
    })

    it('links a submitted quarter to the report it holds', () => {
      const [row] = build({ reportingPeriods: [aQuarter(1)] }).reports.rows
      const action = row?.[4]

      expect(action && 'html' in action ? action.html : '').toContain(
        `${registrationPath}/reports/2026/quarterly/1/submissions/1/view`
      )
    })

    it('offers no link for a quarter that was never reported', () => {
      const [row] = build({
        reportingPeriods: [
          aQuarter(1, { periodStatus: 'overdue', report: null })
        ]
      }).reports.rows

      expect(row?.[4]).toStrictEqual({
        text: '',
        classes: 'govuk-!-text-align-right'
      })
      expect(row?.[2]).toStrictEqual({ text: '' })
    })

    it('shows no rows where the calendar answered none', () => {
      expect(build().reports.rows).toStrictEqual([])
    })
  })

  describe('the waste balance ledger', () => {
    beforeEach(() => {
      config.set('featureFlags.wasteRecordsDownload', true)
    })

    afterEach(() => {
      config.set('featureFlags.wasteRecordsDownload', false)
    })

    it('offers no ledger where none was read', () => {
      expect(build({ ledgerEvents: null }).ledger).toBeNull()
    })

    // The page's own tests stub the fetch helper, so a caller that names no
    // ledger at all reads the same as one that may not see it.
    it('offers no ledger where none was named', () => {
      expect(build({ ledgerEvents: undefined }).ledger).toBeNull()
    })

    // An empty ledger is still a ledger: the section says nothing has moved
    // the balance yet, which is not the same as showing no section.
    it('offers an empty ledger where nothing has moved the balance yet', () => {
      expect(build({ ledgerEvents: [] }).ledger).toStrictEqual({ rows: [] })
    })

    it('reads the newest event of the year first', () => {
      const ledger = build({
        ledgerEvents: [
          aLedgerEvent('2026-02-01T09:00:00.000Z'),
          aLedgerEvent('2026-05-04T09:00:00.000Z')
        ]
      }).ledger

      expect(ledger?.rows.map((row) => cellsOf(row).at(0))).toStrictEqual([
        '4 May 2026, 10:00am',
        '1 February 2026, 9:00am'
      ])
    })

    it('carries no balance columns, and offers the submission itself', () => {
      const ledger = build({ ledgerEvents: [aLedgerEvent()] }).ledger

      expect(cellsOf(ledger?.rows.at(0))).toStrictEqual([
        '4 May 2026, 10:00am',
        'waste-balance-ledger:events.summary-log-submitted',
        'Ada Lovelace (ada@example.com)',
        `<a href="${registrationPath}/summary-logs/files/log-1/download" class="govuk-link">waste-balance-ledger:actionDownload <span class="govuk-visually-hidden">4 May 2026, 10:00am</span></a><br>\n<a href="${registrationPath}/summary-logs/files/log-1/download.csv" class="govuk-link">waste-balance-ledger:actionDownloadCsv <span class="govuk-visually-hidden">4 May 2026, 10:00am</span></a>`
      ])
    })

    it('offers the workbook alone while the records are dark', () => {
      config.set('featureFlags.wasteRecordsDownload', false)

      const ledger = build({ ledgerEvents: [aLedgerEvent()] }).ledger

      expect(cellsOf(ledger?.rows.at(0)).at(3)).toBe(
        `<a href="${registrationPath}/summary-logs/files/log-1/download" class="govuk-link">waste-balance-ledger:actionDownload <span class="govuk-visually-hidden">4 May 2026, 10:00am</span></a>`
      )
    })
  })
})
