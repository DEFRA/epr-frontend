import { CADENCE } from '#server/reports/constants.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

/**
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { CadenceValue } from '#server/reports/constants.js'
 * @import { ReportingPeriod } from '#server/reports/helpers/fetch-reporting-periods.js'
 * @import { AccreditationResource } from '../../helpers/types.js'
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

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const accreditationId = 'acc-001'
const accreditationPath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`

const organisation = /** @type {Organisation} */ (
  /** @type {unknown} */ ({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  })
)

const registration = /** @type {Registration} */ (
  /** @type {unknown} */ ({
    id: registrationId,
    registrationNumber: 'R26ER5001180041PL'
  })
)

/**
 * @param {Partial<AccreditationResource>} [overrides]
 * @returns {AccreditationResource}
 */
const anAccreditation = (overrides) =>
  /** @type {AccreditationResource} */ (
    /** @type {unknown} */ ({
      id: accreditationId,
      accreditationNumber: 'A26ER5001180114PL',
      status: 'approved',
      ...overrides
    })
  )

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
 *   accreditation?: Partial<AccreditationResource>,
 *   cadence?: CadenceValue,
 *   reportingPeriods?: ReportingPeriod[]
 * }} [overrides]
 */
const build = ({
  accreditation,
  cadence = CADENCE.MONTHLY,
  reportingPeriods = []
} = {}) =>
  buildViewModel({
    request,
    organisation,
    registration,
    accreditation: anAccreditation(accreditation),
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

  it('leaves a missing number out of the caption rather than showing it empty', () => {
    expect(
      build({ accreditation: { accreditationNumber: null } }).caption
    ).toBe('Kirkby Plastics Ltd - R26ER5001180041PL')
  })

  it('titles the page by the accreditation number where there is one', () => {
    expect(build().pageTitle).toBe('A26ER5001180114PL: Reports')
  })

  it('falls back to the heading when there is no number', () => {
    expect(
      build({ accreditation: { accreditationNumber: null } }).pageTitle
    ).toBe('Reports')
  })

  it('walks back through the accreditation, ending on this page unlinked', () => {
    expect(build().breadcrumbs).toStrictEqual([
      { text: 'All organisations', href: '/regulators/home' },
      { text: 'Kirkby Plastics Ltd', href: `/organisations/${organisationId}` },
      {
        text: 'Registration details',
        href: `/organisations/${organisationId}/registrations/${registrationId}`
      },
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

  it('shows no rows where the registration owes quarterly reports', () => {
    expect(
      build({ cadence: CADENCE.QUARTERLY, reportingPeriods: [aPeriod(3)] })
        .reports.rows
    ).toStrictEqual([])
  })
})
