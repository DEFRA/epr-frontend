import { CADENCE } from '#server/reports/constants.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod, ReportListItem } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { LedgerEvent } from '#server/common/helpers/waste-balance-ledger/fetch-ledger-events.js'
 * @import { AccreditationResource } from '../helpers/types.js'
 * @import { TableRow } from './build-view-model.js'
 */

const localise = createMockLocalise({
  'registrations:details:accreditation:breadcrumb': 'Accreditation details',
  'registrations:details:accreditation:heading': 'Accreditation',
  'registrations:details:accreditation:reports:actions': 'Actions',
  'registrations:details:accreditation:reports:dueDate': 'Due date',
  'registrations:details:accreditation:reports:period': 'Period',
  'registrations:details:accreditation:reports:status': 'Status',
  'registrations:details:accreditation:reports:submissionDate':
    'Submission date',
  'registrations:details:accreditation:summary:number': 'Accreditation number',
  'registrations:details:accreditation:summary:status': 'Accreditation status',
  'registrations:details:accreditation:summary:wasteBalanceAvailable':
    'Waste balance available (tonnes)',
  'registrations:details:allOrganisations': 'All organisations',
  'registrations:details:current': 'Current',
  'registrations:details:heading': 'Registration details',
  'registrations:details:period': '{{from}} to {{to}}',
  'waste-balance-ledger:events.prn-issued': '{{noteType}} issued',
  'waste-balance-ledger:events.summary-log-submitted': 'Summary log submitted',
  'waste-balance-ledger:systemActor': 'System',
  'reports:actionView': 'View report',
  'reports:months.7': 'July',
  'reports:months.8': 'August',
  'reports:months.12': 'December',
  'reports:quarterlyPeriod': 'Quarter {{number}}, {{year}}',
  'reports:statusOverdue': 'Overdue',
  'reports:statusResubmitted': 'Resubmitted',
  'reports:statusSubmitted': 'Submitted'
})

/** @type {(path: string) => string} */
const localiseUrl = (path) => path

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const accreditationId = 'acc-001'

const organisation = /** @type {Organisation} */ (
  /** @type {unknown} */ ({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  })
)

/**
 * @param {Partial<Registration>} [overrides]
 * @returns {Registration}
 */
const aRegistration = (overrides) =>
  /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL',
      ...overrides
    })
  )

/**
 * @param {Partial<AccreditationResource>} [overrides]
 * @returns {AccreditationResource}
 */
const anAccreditation = (overrides) => ({
  id: accreditationId,
  accreditationNumber: 'A26ER5001180114PL',
  status: 'approved',
  reprocessingType: 'input',
  dateRange: { validFrom: '2026-07-01', validTo: '2026-12-31' },
  application: {
    orgName: 'Kirkby Plastics',
    submittedToRegulator: 'ea',
    material: 'plastic',
    wasteProcessingType: 'reprocessor'
  },
  ...overrides
})

const aWasteBalance = { amount: 1234.5, availableAmount: 987.25 }

/**
 * @param {Partial<ReportingPeriod>} [overrides]
 * @returns {ReportingPeriod}
 */
const aPeriod = (overrides) =>
  /** @type {ReportingPeriod} */ (
    /** @type {unknown} */ ({
      year: 2026,
      period: 8,
      submissionNumber: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      dueDate: '2026-09-20',
      periodStatus: 'submitted',
      report: { submittedAt: '2026-09-15T15:09:00.000Z' },
      ...overrides
    })
  )

/** @type {{ cadence: CadenceValue | null, reportingPeriods: ReportingPeriod[] }} */
const noCalendar = { cadence: CADENCE.MONTHLY, reportingPeriods: [] }

/** @type {LedgerEvent} */
const prnIssued = {
  kind: 'prn-issued',
  createdAt: '2026-02-15T15:09:00.000Z',
  createdBy: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
  prn: { tonnage: 12.5 },
  balance: { closing: { total: 100, available: 87.5 } }
}

/** @type {LedgerEvent} */
const summaryLogSubmitted = {
  kind: 'summary-log-submitted',
  createdAt: '2026-01-04T09:00:00.000Z',
  createdBy: { id: 'system' },
  summaryLog: { creditTotal: 100 },
  balance: { closing: { total: 100, available: 100 } }
}

/**
 * @param {Partial<AccreditationResource>} [accreditationOverrides]
 * @param {Partial<Registration>} [registrationOverrides]
 * @param {WasteBalance | null} [wasteBalance]
 * @param {{ cadence: CadenceValue | null, reportingPeriods: ReportingPeriod[] }} [calendar]
 * @param {LedgerEvent[] | null} [ledgerEvents]
 */
const build = (
  accreditationOverrides,
  registrationOverrides,
  wasteBalance = aWasteBalance,
  calendar = noCalendar,
  ledgerEvents = null
) =>
  buildViewModel({
    organisation,
    registration: aRegistration(registrationOverrides),
    accreditation: anAccreditation(accreditationOverrides),
    wasteBalance,
    reportingPeriods: calendar.reportingPeriods,
    cadence: calendar.cadence,
    ledgerEvents,
    localise,
    localiseUrl
  })

/**
 * @param {LedgerEvent[] | null} ledgerEvents
 * @param {Partial<Registration>} [registrationOverrides]
 */
const ledgerOf = (ledgerEvents, registrationOverrides) =>
  build(
    undefined,
    registrationOverrides,
    aWasteBalance,
    noCalendar,
    ledgerEvents
  ).ledger

/**
 * @param {ReportingPeriod[]} reportingPeriods
 * @param {CadenceValue | null} [cadence]
 * @returns {TableRow[]}
 */
const reportRows = (reportingPeriods, cadence = CADENCE.MONTHLY) =>
  build(undefined, undefined, aWasteBalance, { cadence, reportingPeriods })
    .reports.rows

describe('the accreditation details view model', () => {
  it('names the organisation, the registration and the accreditation in the caption', () => {
    expect(build().caption).toBe(
      'Kirkby Plastics Ltd - R26ER5001180041PL - A26ER5001180114PL'
    )
  })

  it('leaves a missing number out of the caption rather than showing it empty', () => {
    expect(build({ accreditationNumber: null }).caption).toBe(
      'Kirkby Plastics Ltd - R26ER5001180041PL'
    )
  })

  it('knows an organisation by its trading name where it has one', () => {
    const model = buildViewModel({
      organisation: /** @type {Organisation} */ (
        /** @type {unknown} */ ({
          id: organisationId,
          companyDetails: {
            name: 'Kirkby Plastics Ltd',
            tradingName: 'Kirkby Recycling'
          }
        })
      ),
      registration: aRegistration(),
      accreditation: anAccreditation(),
      wasteBalance: aWasteBalance,
      reportingPeriods: [],
      cadence: CADENCE.MONTHLY,
      ledgerEvents: null,
      localise,
      localiseUrl
    })

    expect(model.caption).toContain('Kirkby Recycling')
  })

  it('names the page alone in the heading', () => {
    expect(build().heading).toBe('Accreditation')
  })

  it('names the validity period beneath the heading', () => {
    expect(build().period).toBe('1 July to 31 December 2026')
  })

  it('reads an accreditation with no end date as current', () => {
    expect(
      build({ dateRange: { validFrom: '2026-07-01', validTo: null } }).period
    ).toBe('1 July 2026 to Current')
  })

  it('names no period for an accreditation that has not been approved', () => {
    expect(
      build({ dateRange: { validFrom: null, validTo: null } }).period
    ).toBe('')
  })

  it('shows the status as a tag, then the number, then the available balance', () => {
    expect(build().summaryRows).toStrictEqual([
      {
        key: 'Accreditation status',
        status: { text: 'Approved', classes: 'govuk-tag--green' }
      },
      { key: 'Accreditation number', value: 'A26ER5001180114PL' },
      { key: 'Waste balance available (tonnes)', value: '987.25' }
    ])
  })

  it('shows an empty number for an accreditation that never got one', () => {
    expect(build({ accreditationNumber: null }).summaryRows[1]).toStrictEqual({
      key: 'Accreditation number',
      value: ''
    })
  })

  it('shows a balance of nothing as zero rather than as blank', () => {
    expect(
      build(undefined, undefined, { amount: 0, availableAmount: 0 })
        .summaryRows[2]
    ).toStrictEqual({
      key: 'Waste balance available (tonnes)',
      value: '0.00'
    })
  })

  it('leaves the balance blank when it could not be read', () => {
    expect(build(undefined, undefined, null).summaryRows[2]).toStrictEqual({
      key: 'Waste balance available (tonnes)',
      value: ''
    })
  })

  it('walks back to the registration and the organisation', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      { text: 'Kirkby Plastics Ltd', href: `/organisations/${organisationId}` },
      {
        text: 'Registration details',
        href: `/organisations/${organisationId}/registrations/${registrationId}`
      },
      { text: 'Accreditation details' }
    ])
  })

  it('titles the page by the accreditation number where there is one', () => {
    expect(build().pageTitle).toBe('A26ER5001180114PL: Accreditation details')
  })

  it('falls back to the page name when there is no number', () => {
    expect(build({ accreditationNumber: null }).pageTitle).toBe(
      'Accreditation details'
    )
  })
})

describe('the reports table on the accreditation details view model', () => {
  const viewPath = `/organisations/${organisationId}/registrations/${registrationId}/reports`

  it('names the five columns the design asks for, sizing the four data columns and hugging the actions', () => {
    expect(build().reports.head).toStrictEqual([
      { text: 'Period', classes: 'govuk-!-width-one-quarter' },
      { text: 'Due date', classes: 'govuk-!-width-one-quarter' },
      { text: 'Submission date', classes: 'govuk-!-width-one-quarter' },
      { text: 'Status', classes: 'govuk-!-width-one-quarter' },
      { text: 'Actions', classes: 'govuk-!-text-align-right' }
    ])
  })

  it('shows a submitted period with the moment it arrived and a way to read it', () => {
    expect(reportRows([aPeriod()])).toStrictEqual([
      [
        { text: 'August, 2026' },
        { text: '20 Sept 2026' },
        { text: '15 Sept 2026, 4:09pm' },
        {
          html: '<strong class="govuk-tag govuk-tag--green">Submitted</strong>'
        },
        {
          html: `<a href="${viewPath}/2026/monthly/8/submissions/1/view" class="govuk-link">View report <span class="govuk-visually-hidden">August, 2026</span></a>`,
          classes: 'govuk-!-text-align-right'
        }
      ]
    ])
  })

  it('leaves an unsubmitted period without a submission date and without a link to a report that does not exist', () => {
    expect(
      reportRows([
        aPeriod({ period: 7, periodStatus: 'overdue', report: null })
      ])
    ).toStrictEqual([
      [
        { text: 'July, 2026' },
        { text: '20 Sept 2026' },
        { text: '' },
        { html: '<strong class="govuk-tag govuk-tag--red">Overdue</strong>' },
        { text: '', classes: 'govuk-!-text-align-right' }
      ]
    ])
  })

  it('reads a later submission as resubmitted, from the period rather than from its report', () => {
    const rows = reportRows([
      aPeriod({
        submissionNumber: 2,
        report: /** @type {ReportListItem} */ (
          /** @type {unknown} */ ({
            submittedAt: '2026-09-15T15:09:00.000Z',
            submissionNumber: 1
          })
        )
      })
    ])

    expect(rows[0][3]).toStrictEqual({
      html: '<strong class="govuk-tag govuk-tag--green">Resubmitted</strong>'
    })
  })

  it('names a quarterly period by its quarter', () => {
    const rows = reportRows(
      [aPeriod({ period: 3, report: null, periodStatus: 'overdue' })],
      CADENCE.QUARTERLY
    )

    expect(rows[0][0]).toStrictEqual({ text: 'Quarter 3, 2026' })
  })

  it('leads with the most recent period, whatever order the calendar answered in', () => {
    const rows = reportRows([
      aPeriod({ year: 2025, period: 12 }),
      aPeriod({ period: 8 }),
      aPeriod({ period: 7 })
    ])

    expect(rows.map((row) => row[0])).toStrictEqual([
      { text: 'August, 2026' },
      { text: 'July, 2026' },
      { text: 'December, 2025' }
    ])
  })

  it('shows no rows for an accreditation with no reporting periods', () => {
    expect(reportRows([])).toStrictEqual([])
  })

  it('shows no rows for a calendar the page could not read', () => {
    expect(reportRows([], null)).toStrictEqual([])
  })
})

describe('the waste balance ledger on the accreditation details view model', () => {
  it('offers no ledger where none was read', () => {
    expect(ledgerOf(null)).toBeNull()
  })

  it('offers an empty ledger where nothing has moved the balance yet', () => {
    expect(ledgerOf([])).toStrictEqual({ rows: [] })
  })

  it('reads the events newest first, each with its tonnage, both balances and its actor', () => {
    expect(ledgerOf([summaryLogSubmitted, prnIssued])?.rows).toStrictEqual([
      [
        { text: '15 February 2026, 3:09pm' },
        { text: 'PRN issued' },
        { text: '12.50' },
        { text: '100.00' },
        { text: '87.50' },
        { text: 'Ada Lovelace (ada@example.com)' }
      ],
      [
        { text: '4 January 2026, 9:00am' },
        { text: 'Summary log submitted' },
        { text: '100.00' },
        { text: '100.00' },
        { text: '100.00' },
        { text: 'System' }
      ]
    ])
  })

  it("names an exporter's notes PERNs", () => {
    const rows = ledgerOf([prnIssued], {
      wasteProcessingType: 'exporter'
    })?.rows

    expect(rows?.at(0)?.at(1)).toStrictEqual({ text: 'PERN issued' })
  })
})
