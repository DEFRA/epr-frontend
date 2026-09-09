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
 * @import { PackagingRecyclingNote } from '#server/prns/helpers/fetch-packaging-recycling-notes.js'
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
  'registrations:details:accreditation:prns:actions': 'Actions',
  'registrations:details:accreditation:prns:date': 'Date',
  'registrations:details:accreditation:prns:recipient':
    'Producer or compliance scheme',
  'registrations:details:accreditation:prns:status': 'Status',
  'registrations:details:accreditation:prns:tonnage': 'Tonnage',
  'registrations:details:accreditation:prns:view': 'View',
  'registrations:details:accreditation:prns:heading': '{{noteTypePlural}}',
  'registrations:details:accreditation:prns:none':
    'This accreditation has issued no {{noteTypePlural}}.',
  'prns:list:status:accepted': 'Accepted',
  'prns:list:status:awaitingAuthorisation': 'Awaiting authorisation',
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
  'waste-balance-ledger:table.noMovement': 'N/A',
  'waste-balance-ledger:actionView': 'View',
  'reports:actionView': 'View',
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
  prn: { id: 'prn-001', prnNumber: '240000123', tonnage: 12.5 },
  balance: {
    opening: { total: 100, available: 87.5 },
    closing: { total: 87.5, available: 87.5 }
  }
}

/** @type {LedgerEvent} */
const summaryLogSubmitted = {
  kind: 'summary-log-submitted',
  createdAt: '2026-01-04T09:00:00.000Z',
  createdBy: { id: 'system' },
  summaryLog: { id: 'log-1', creditTotal: 100 },
  balance: {
    opening: { total: 0, available: 0 },
    closing: { total: 100, available: 100 }
  }
}

/**
 * @param {Partial<AccreditationResource>} [accreditationOverrides]
 * @param {Partial<Registration>} [registrationOverrides]
 * @param {WasteBalance | null} [wasteBalance]
 * @param {{ cadence: CadenceValue | null, reportingPeriods: ReportingPeriod[] }} [calendar]
 * @param {LedgerEvent[] | null} [ledgerEvents]
 * @param {PackagingRecyclingNote[]} [packagingRecyclingNotes]
 */
const build = (
  accreditationOverrides,
  registrationOverrides,
  wasteBalance = aWasteBalance,
  calendar = noCalendar,
  ledgerEvents = null,
  packagingRecyclingNotes = []
) =>
  buildViewModel({
    organisation,
    registration: aRegistration(registrationOverrides),
    accreditation: anAccreditation(accreditationOverrides),
    wasteBalance,
    reportingPeriods: calendar.reportingPeriods,
    cadence: calendar.cadence,
    ledgerEvents,
    packagingRecyclingNotes,
    localise,
    localiseUrl
  })

/**
 * @param {Partial<PackagingRecyclingNote> & { status: string }} note
 * @returns {PackagingRecyclingNote}
 */
const aNote = (note) => ({
  id: 'prn-001',
  prnNumber: null,
  issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
  tonnage: 20,
  material: 'plastic',
  createdAt: '2026-01-26T09:00:00.000Z',
  issuedAt: null,
  wasteProcessingType: 'reprocessor',
  processToBeUsed: '',
  isDecemberWaste: false,
  ...note
})

/**
 * @param {PackagingRecyclingNote[]} notes
 */
const prnsOf = (notes) =>
  build(undefined, undefined, aWasteBalance, noCalendar, null, notes).prns

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
      packagingRecyclingNotes: [],
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
          html: `<a href="${viewPath}/2026/monthly/8/submissions/1/view" class="govuk-link">View <span class="govuk-visually-hidden">August, 2026</span></a>`,
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

  // An accredited operator reports monthly. A registration currently owing
  // quarterly reports has a registered-only period, and those quarters are that
  // page's to show rather than this one's - the calendar answers one cadence,
  // so showing them here would put the same periods on two pages.
  it('shows no rows where the registration owes quarterly reports', () => {
    const rows = reportRows(
      [aPeriod({ period: 3, report: null, periodStatus: 'overdue' })],
      CADENCE.QUARTERLY
    )

    expect(rows).toStrictEqual([])
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

  it('reads the events newest first, each with what it moved, the balance it left and its actor', () => {
    expect(ledgerOf([summaryLogSubmitted, prnIssued])?.rows).toStrictEqual([
      [
        { text: '15 February 2026, 3:09pm' },
        { html: 'PRN issued<br>\n240000123' },
        { text: 'N/A', format: 'numeric' },
        { text: '87.50', format: 'numeric' },
        { text: 'Ada Lovelace (ada@example.com)' },
        {
          html: `<a href="/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/prn-001/view" class="govuk-link">View <span class="govuk-visually-hidden">240000123</span></a>`,
          classes: 'govuk-!-text-align-right'
        }
      ],
      [
        { text: '4 January 2026, 9:00am' },
        { text: 'Summary log submitted' },
        { text: '+100.00', format: 'numeric' },
        { text: '100.00', format: 'numeric' },
        { text: 'System' },
        {
          html: `<a href="/organisations/${organisationId}/registrations/reg-001/summary-logs/files/log-1/download" class="govuk-link">waste-balance-ledger:actionDownload <span class="govuk-visually-hidden">4 January 2026, 9:00am</span></a>`,
          classes: 'govuk-!-text-align-right'
        }
      ]
    ])
  })

  it("names an exporter's notes PERNs", () => {
    const rows = ledgerOf([prnIssued], {
      wasteProcessingType: 'exporter'
    })?.rows

    expect(rows?.at(0)?.at(1)).toStrictEqual({
      html: 'PERN issued<br>\n240000123'
    })
  })

  describe('the PRNs section', () => {
    const notesPath = `/organisations/${organisationId}/registrations/reg-001/accreditations/acc-001/packaging-recycling-notes`

    it('points its detailed view at the notes the accreditation has issued', () => {
      expect(prnsOf([]).href).toBe(notesPath)
    })

    it('names the recipient, the status, the date, the tonnage and a way in', () => {
      const rows = prnsOf([
        aNote({
          id: 'prn-9',
          prnNumber: '240000123',
          status: 'accepted',
          issuedAt: '2026-01-28T09:00:00.000Z',
          tonnage: 20
        })
      ]).rows

      expect(rows).toStrictEqual([
        [
          { text: 'Radar Compliance PLC' },
          {
            html: '<strong class="govuk-tag govuk-tag--green epr-tag--no-max-width">Accepted</strong>'
          },
          { text: '28 January 2026' },
          { text: 20 },
          {
            html: `<a href="${notesPath}/prn-9/view" class="govuk-link">View <span class="govuk-visually-hidden">240000123</span></a>`,
            classes: 'govuk-!-text-align-right'
          }
        ]
      ])
    })

    it('dates a note awaiting issue by when it was created, not by a gap', () => {
      const rows = prnsOf([
        aNote({
          status: 'awaiting_authorisation',
          createdAt: '2026-01-26T09:00:00.000Z',
          issuedAt: null
        })
      ]).rows

      expect(rows.at(0)?.at(2)).toStrictEqual({ text: '26 January 2026' })
    })

    it('names an unnumbered note by its date, so identical links stay apart', () => {
      const rows = prnsOf([
        aNote({ status: 'awaiting_authorisation', prnNumber: null })
      ]).rows

      expect(rows.at(0)?.at(4)).toStrictEqual({
        html: `<a href="${notesPath}/prn-001/view" class="govuk-link">View <span class="govuk-visually-hidden">26 January 2026</span></a>`,
        classes: 'govuk-!-text-align-right'
      })
    })

    it('shows no more than three, newest first, and counts what it shows', () => {
      const issuedOn = (/** @type {string} */ day) =>
        aNote({
          id: `prn-${day}`,
          status: 'accepted',
          issuedAt: `2026-01-${day}T09:00:00.000Z`
        })

      const prns = prnsOf([
        issuedOn('10'),
        issuedOn('20'),
        issuedOn('30'),
        issuedOn('05')
      ])

      expect(prns.count).toBe(3)
      expect(prns.rows.map((row) => row.at(2))).toStrictEqual([
        { text: '30 January 2026' },
        { text: '20 January 2026' },
        { text: '10 January 2026' }
      ])
    })

    it('counts what there is where the accreditation has issued fewer', () => {
      expect(prnsOf([aNote({ status: 'accepted' })]).count).toBe(1)
    })

    it('shows a regulator no draft and no discarded note', () => {
      const prns = prnsOf([
        aNote({ id: 'a', status: 'draft' }),
        aNote({ id: 'b', status: 'discarded' })
      ])

      expect(prns.rows).toStrictEqual([])
      expect(prns.count).toBe(0)
    })

    it('heads the five columns the design names, with the action right-aligned', () => {
      expect(prnsOf([]).head).toStrictEqual([
        { text: 'Producer or compliance scheme' },
        { text: 'Status' },
        { text: 'Date' },
        { text: 'Tonnage' },
        { text: 'Actions', classes: 'govuk-!-text-align-right' }
      ])
    })

    it("names an exporter's notes PERNs, as the page it links to does", () => {
      const prns = build(
        undefined,
        { wasteProcessingType: 'exporter' },
        aWasteBalance,
        noCalendar,
        null,
        []
      ).prns

      expect(prns.heading).toBe('PERNs')
      expect(prns.noneText).toContain('PERNs')
    })

    it('carries no material column, which would repeat one value on every row', () => {
      const headings = prnsOf([]).head.map((cell) =>
        'text' in cell ? cell.text : ''
      )

      expect(headings).not.toContain('Material')
    })
  })
})
