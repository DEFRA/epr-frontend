import { CADENCE } from '#server/reports/constants.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { AccreditationView, OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 */

const localise = createMockLocalise({
  'registrations:details:accreditation:breadcrumb': 'Accreditation details',
  'registrations:details:accreditation:reports:actions': 'Actions',
  'registrations:details:accreditation:reports:dueDate': 'Due date',
  'registrations:details:accreditation:reports:heading': 'Reports',
  'registrations:details:accreditation:reports:period': 'Period',
  'registrations:details:accreditation:reports:status': 'Status',
  'registrations:details:accreditation:reports:submissionDate':
    'Submission date',
  'registrations:details:allOrganisations': 'All organisations',
  'registrations:details:heading': 'Registration details',
  'reports:actionView': 'View',
  'reports:months.4': 'April',
  'reports:months.5': 'May',
  'reports:months.6': 'June',
  'reports:months.7': 'July',
  'reports:months.8': 'August',
  'reports:statusSubmitted': 'Submitted'
})

const request = /** @type {HapiRequest} */ (
  /** @type {unknown} */ ({
    t: localise,
    localiseUrl: (/** @type {string} */ path) => path
  })
)

const keys = {
  organisationNumber: '500118',
  registrationNumber: 'R26ER5001180041PL',
  year: '2026'
}
const registrationPath = `/organisations/500118/registrations/R26ER5001180041PL`
const accreditationPath = `${registrationPath}/accreditations/2026`

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

/** @type {AccreditationView} */
const accreditation = {
  accreditationNumber: 'A26ER5001180114PL',
  status: 'approved',
  statusTimeline: { '2026-01-01T09:00:00.000Z': { status: 'approved' } }
}

/**
 * @param {number} period
 * @returns {ReportingPeriod}
 */
const aPeriod = (period) =>
  /** @type {ReportingPeriod} */ (
    /** @type {unknown} */ ({
      year: 2026,
      period,
      submissionNumber: 1,
      dueDate: '2026-09-20',
      periodStatus: 'submitted',
      report: { submittedAt: '2026-09-15T15:09:00.000Z' }
    })
  )

/**
 * @param {{
 *   organisation?: OrganisationView,
 *   cadence?: CadenceValue,
 *   reportingPeriods?: ReportingPeriod[]
 * }} [overrides]
 */
const build = ({
  organisation = anOrganisation(),
  cadence = CADENCE.MONTHLY,
  reportingPeriods = []
} = {}) =>
  buildViewModel({
    request,
    keys,
    organisation,
    accreditation,
    cadence,
    reportingPeriods
  })

describe('the accreditation reports view model', () => {
  it('names the page Reports', () => {
    expect(build().heading).toBe('Reports')
  })

  it('names the organisation, the registration and the accreditation in the caption', () => {
    expect(build().caption).toBe(
      'Kirkby Plastics Ltd - R26ER5001180041PL - A26ER5001180114PL'
    )
  })

  it('names the organisation by its trading name where it holds one', () => {
    expect(
      build({
        organisation: anOrganisation({ tradingName: 'Kirkby Recycling' })
      }).caption
    ).toBe('Kirkby Recycling - R26ER5001180041PL - A26ER5001180114PL')
  })

  it('titles the page by the accreditation number', () => {
    expect(build().pageTitle).toBe('A26ER5001180114PL: Reports')
  })

  it('walks back through the accreditation by number, ending on this page unlinked', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      { text: 'Kirkby Plastics Ltd', href: '/organisations/500118' },
      { text: 'Registration details', href: registrationPath },
      { text: 'Accreditation details', href: accreditationPath },
      { text: 'Reports' }
    ])
  })

  it('walks back by the breadcrumbs, with no back link', () => {
    const model = build()

    expect(model).not.toHaveProperty('backUrl')
    expect(model.breadcrumbs.at(-2)).toStrictEqual({
      text: 'Accreditation details',
      href: accreditationPath
    })
    expect(model.breadcrumbs.at(-1)).toStrictEqual({ text: 'Reports' })
  })

  it('links a submitted month to its report under the accreditation', () => {
    const [row] = build({ reportingPeriods: [aPeriod(8)] }).reports.rows
    const action = row?.[4]

    expect(action && 'html' in action ? action.html : '').toContain(
      `href="${accreditationPath}/reports/monthly/8/submissions/1/view"`
    )
  })

  it('heads the five columns the accreditation page does', () => {
    expect(build().reports.head).toStrictEqual([
      { text: 'Period', classes: 'govuk-!-width-one-quarter' },
      { text: 'Due date', classes: 'govuk-!-width-one-quarter' },
      { text: 'Submission date', classes: 'govuk-!-width-one-quarter' },
      { text: 'Status', classes: 'govuk-!-width-one-quarter' },
      { text: 'Actions', classes: 'govuk-!-text-align-right' }
    ])
  })

  it('lists every period, newest first, however many there are', () => {
    const { rows } = build({
      reportingPeriods: [
        aPeriod(5),
        aPeriod(8),
        aPeriod(4),
        aPeriod(7),
        aPeriod(6)
      ]
    }).reports

    expect(rows.map((row) => row[0])).toStrictEqual([
      { text: 'August, 2026' },
      { text: 'July, 2026' },
      { text: 'June, 2026' },
      { text: 'May, 2026' },
      { text: 'April, 2026' }
    ])
  })

  it("lists only the accreditation year's periods where the calendar spans years", () => {
    const { rows } = build({
      reportingPeriods: [
        { ...aPeriod(12), year: 2025 },
        aPeriod(8),
        { ...aPeriod(1), year: 2027 }
      ]
    }).reports

    expect(rows.map((row) => row[0])).toStrictEqual([{ text: 'August, 2026' }])
  })

  it('shows no rows where the registration owes quarterly reports', () => {
    expect(
      build({ cadence: CADENCE.QUARTERLY, reportingPeriods: [aPeriod(3)] })
        .reports.rows
    ).toStrictEqual([])
  })
})
