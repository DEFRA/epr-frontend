import { config } from '#config/config.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { AccreditationResource } from '../helpers/types.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
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
    dateRange: { validFrom: '2026-01-01' },
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
 *   organisation?: Organisation,
 *   registration?: RegistrationResource,
 *   accreditations?: AccreditationResource[],
 *   cadence?: CadenceValue | null,
 *   reportingPeriods?: ReportingPeriod[],
 *   ledgerEvents?: LedgerEvent[] | null,
 *   year?: number
 * }} [overrides]
 */
const build = ({
  organisation,
  registration,
  accreditations,
  cadence = 'quarterly',
  reportingPeriods,
  ledgerEvents = null,
  year
} = {}) =>
  buildViewModel({
    organisation: organisation ?? anOrganisation(),
    registration: registration ?? aRegistration(),
    accreditations: accreditations ?? [],
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
        `/organisations/${organisationId}/registrations/reg-001/reports/2026/quarterly/1/submissions/1/view`
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

    it('leaves out the events of every other year', () => {
      const ledger = build({
        ledgerEvents: [aLedgerEvent('2025-05-04T09:00:00.000Z')],
        year: 2026
      }).ledger

      expect(ledger).toStrictEqual({ rows: [] })
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
        `<a href="/organisations/${organisationId}/registrations/reg-001/summary-logs/files/log-1/download" class="govuk-link">waste-balance-ledger:actionDownload <span class="govuk-visually-hidden">4 May 2026, 10:00am</span></a><br>\n<a href="/organisations/${organisationId}/registrations/reg-001/summary-logs/files/log-1/download.csv" class="govuk-link">waste-balance-ledger:actionDownloadCsv <span class="govuk-visually-hidden">4 May 2026, 10:00am</span></a>`
      ])
    })

    it('offers the workbook alone while the records are dark', () => {
      config.set('featureFlags.wasteRecordsDownload', false)

      const ledger = build({ ledgerEvents: [aLedgerEvent()] }).ledger

      expect(cellsOf(ledger?.rows.at(0)).at(3)).toBe(
        `<a href="/organisations/${organisationId}/registrations/reg-001/summary-logs/files/log-1/download" class="govuk-link">waste-balance-ledger:actionDownload <span class="govuk-visually-hidden">4 May 2026, 10:00am</span></a>`
      )
    })
  })
})
