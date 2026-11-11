import { toYear } from '#server/common/helpers/year.js'
import { config } from '#config/config.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { Year } from '#server/common/helpers/year.js'
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

const organisationNumber = toOrganisationNumber('500118')
const registrationNumber = toRegistrationNumber('R26ER5001180041PL')
const registrationPath = `/organisations/${organisationNumber}/registrations/${registrationNumber}`

/**
 * @param {Partial<OrganisationView>} [overrides]
 * @returns {OrganisationView}
 */
const anOrganisation = (overrides) => ({
  organisationNumber: toOrganisationNumber('500118'),
  name: 'Kirkby Plastics Ltd',
  displayName: 'Kirkby Plastics Ltd',
  status: { current: 'active' },
  submittedToRegulator: { code: 'ea' },
  registrations: {},
  ...overrides
})

/**
 * @returns {RegistrationView}
 */
const aRegistration = () => ({
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2026-01-01T00:00:00.000Z' }]
  },
  regAccStatusByDate: { 2026: { '2026-01-01': { status: 'registeredOnly' } } },
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'reprocessor',
  reprocessingType: 'input',
  site: { address: { fullAddress: 'North Road, Leeds' } },
  accreditations: {}
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
 *   reportingPeriods?: ReportingPeriod[],
 *   ledgerEvents?: LedgerEvent[] | null,
 *   year?: Year
 * }} [overrides]
 */
const build = ({
  organisation,
  registration,
  reportingPeriods,
  ledgerEvents = null,
  year
} = {}) =>
  buildViewModel({
    organisation: organisation ?? anOrganisation(),
    registration: registration ?? aRegistration(),
    keys: { organisationNumber, registrationNumber },
    reportingPeriods: reportingPeriods ?? [],
    ledgerEvents,
    year: year ?? toYear(2026),
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

  it('names the organisation by its display name', () => {
    expect(
      build({
        organisation: anOrganisation({ displayName: 'Kirkby Recycling' })
      }).caption
    ).toBe('Kirkby Recycling - R26ER5001180041PL')
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

  /**
   * @param {RegistrationView['regAccStatusByDate'][`${number}`]} byDate
   * @returns {RegistrationView}
   */
  const servedIn2026 = (byDate) => ({
    ...aRegistration(),
    regAccStatusByDate: { 2026: byDate }
  })

  it('holds data in a year served as registered-only', () => {
    expect(build().hasData).toBe(true)
  })

  it('holds data where registered-only gives way to accredited', () => {
    expect(
      build({
        registration: servedIn2026({
          '2026-01-01': { status: 'registeredOnly' },
          '2026-03-01': { status: 'accredited' }
        })
      }).hasData
    ).toBe(true)
  })

  it('holds data where accredited gives way to registered-only', () => {
    expect(
      build({
        registration: servedIn2026({
          '2026-01-01': { status: 'accredited' },
          '2026-03-10': { status: 'registeredOnly' }
        })
      }).hasData
    ).toBe(true)
  })

  it('holds none in a year served only as accredited', () => {
    expect(
      build({
        registration: servedIn2026({ '2026-01-01': { status: 'accredited' } })
      }).hasData
    ).toBe(false)
  })

  it('holds none where accredited gives way to cancelled', () => {
    expect(
      build({
        registration: servedIn2026({
          '2026-01-01': { status: 'accredited' },
          '2026-03-01': { status: 'cancelled' }
        })
      }).hasData
    ).toBe(false)
  })

  it('holds none in a year not served', () => {
    expect(build({ year: toYear(2027) }).hasData).toBe(false)
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
