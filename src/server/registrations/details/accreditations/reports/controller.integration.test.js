/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { asOrganisation } from '#server/common/test-helpers/organisation-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByTestId,
  within
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import { fetchReportListDetails } from './helpers/fetch-report-list-details.js'

/**
 * @import { ReportListDetails } from './helpers/fetch-report-list-details.js'
 */

vi.mock(import('./helpers/fetch-report-list-details.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const accreditationId = 'acc-001'
const accreditationPath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`
const path = `${accreditationPath}/reports`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {number} period
 * @param {{ submitted: boolean }} options
 * @returns {ReportListDetails['reportingPeriods'][number]}
 */
const aPeriod = (period, { submitted }) =>
  /** @type {ReportListDetails['reportingPeriods'][number]} */ (
    /** @type {unknown} */ ({
      year: 2026,
      period,
      submissionNumber: 1,
      dueDate: '2026-09-20',
      periodStatus: submitted ? 'submitted' : 'overdue',
      report: submitted ? { submittedAt: '2026-09-15T15:09:00.000Z' } : null
    })
  )

/** @type {ReportListDetails} */
const details = {
  organisation: asOrganisation({
    id: organisationId,
    companyDetails: { name: 'Kirkby Plastics Ltd' }
  }),
  registration: /** @type {ReportListDetails['registration']} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL'
    })
  ),
  accreditation: /** @type {ReportListDetails['accreditation']} */ (
    /** @type {unknown} */ ({
      id: accreditationId,
      accreditationNumber: 'A26ER5001180114PL',
      status: 'approved'
    })
  ),
  cadence: 'monthly',
  reportingPeriods: [
    aPeriod(5, { submitted: true }),
    aPeriod(8, { submitted: true }),
    aPeriod(6, { submitted: false }),
    aPeriod(7, { submitted: false }),
    aPeriod(4, { submitted: true })
  ]
}

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 */
const visit = async (server, auth) => {
  const response = await server.inject({ method: 'GET', url: path, auth })

  return { statusCode: response.statusCode, body: asHtml(response.result) }
}

/** @param {string} body */
const documentOf = (body) => new JSDOM(body).window.document.body

/** @param {ReturnType<typeof getAllByRole>} cells */
const textOf = (cells) => cells.map((cell) => cell.textContent?.trim())

/** @param {string} body */
const reportsTable = (body) => getByTestId(documentOf(body), 'reports-table')

describe('the regulator reports detailed view', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.mocked(fetchReportListDetails).mockResolvedValue(details)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('heads the page Reports, naming the organisation, the registration and the accreditation', async ({
    server
  }) => {
    const { statusCode, body } = await visit(server, regulator)
    const heading = getByRole(documentOf(body), 'heading', { level: 1 })

    expect(statusCode).toBe(statusCodes.ok)
    expect(heading.textContent).toContain('Reports')
    expect(
      heading.querySelector('[class^="govuk-caption-"]')?.textContent
    ).toBe('Kirkby Plastics Ltd - R26ER5001180041PL - A26ER5001180114PL')
  })

  it('lists every monthly period, newest first, beyond the three the accreditation page shows', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const [, ...rows] = getAllByRole(reportsTable(body), 'row')

    expect(
      rows.map((row) => within(row).getByRole('rowheader').textContent?.trim())
    ).toStrictEqual([
      'August, 2026',
      'July, 2026',
      'June, 2026',
      'May, 2026',
      'April, 2026'
    ])
  })

  it('heads the five columns the accreditation page does', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    expect(
      textOf(getAllByRole(reportsTable(body), 'columnheader'))
    ).toStrictEqual([
      'Period',
      'Due date',
      'Submission date',
      'Status',
      'Actions'
    ])
  })

  it('offers a report to read on a submitted period only', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const links = getAllByRole(reportsTable(body), 'link')

    expect(textOf(links)).toStrictEqual([
      'View August, 2026',
      'View May, 2026',
      'View April, 2026'
    ])
    expect(links.at(0)?.getAttribute('href')).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/8/submissions/1/view`
    )
  })

  it('says so rather than showing an empty table where there are no periods', async ({
    server
  }) => {
    vi.mocked(fetchReportListDetails).mockResolvedValue({
      ...details,
      reportingPeriods: []
    })

    const { body } = await visit(server, regulator)

    expect(body).not.toContain('data-testid="reports-table"')
    expect(body).toContain('data-testid="no-reports"')
  })

  it('shows no periods where the registration owes quarterly reports', async ({
    server
  }) => {
    vi.mocked(fetchReportListDetails).mockResolvedValue({
      ...details,
      cadence: 'quarterly'
    })

    const { body } = await visit(server, regulator)

    expect(body).not.toContain('data-testid="reports-table"')
    expect(body).toContain('data-testid="no-reports"')
  })

  it('walks back through the accreditation, ending on this page unlinked', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)
    const crumbs = [
      ...documentOf(body).querySelectorAll('.govuk-breadcrumbs__list-item')
    ]

    expect(textOf(crumbs)).toStrictEqual([
      'All organisations',
      'Kirkby Plastics Ltd',
      'Registration details',
      'Accreditation details',
      'Reports'
    ])
    expect(crumbs.at(3)?.querySelector('a')?.getAttribute('href')).toBe(
      accreditationPath
    )
    expect(crumbs.at(4)?.querySelector('a')).toBeNull()
  })

  it('offers a way back to the accreditation', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(
      document.querySelector('.govuk-back-link')?.getAttribute('href')
    ).toBe(accreditationPath)
    expect(getByTestId(document, 'reports-detailed-view')).toBeDefined()
  })

  it('titles the page by the accreditation number', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(documentOf(body).ownerDocument.title).toContain(
      'A26ER5001180114PL: Reports'
    )
  })

  it('titles the page by the heading alone, and drops the number from the caption, where the accreditation has none', async ({
    server
  }) => {
    vi.mocked(fetchReportListDetails).mockResolvedValue({
      ...details,
      accreditation: /** @type {ReportListDetails['accreditation']} */ ({
        ...details.accreditation,
        accreditationNumber: null
      })
    })

    const { body } = await visit(server, regulator)
    const document = documentOf(body)

    expect(document.ownerDocument.title).toContain('Reports')
    expect(document.ownerDocument.title).not.toContain('A26ER')
    expect(
      document.querySelector('h1 [class^="govuk-caption-"]')?.textContent
    ).toBe('Kirkby Plastics Ltd - R26ER5001180041PL')
  })

  it('offers no way to change anything on the page', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const main = documentOf(body).querySelector('#main-content')

    expect(main?.querySelectorAll('button, form')).toHaveLength(0)
  })

  it('fails where the calendar could not be read', async ({ server }) => {
    vi.mocked(fetchReportListDetails).mockRejectedValue(new Error('nope'))

    const { statusCode } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.internalServerError)
  })

  it('does not exist for an operator', async ({ server }) => {
    const { statusCode } = await visit(server, operator)

    expect(statusCode).toBe(statusCodes.notFound)
    expect(fetchReportListDetails).not.toHaveBeenCalled()
  })

  it('does not exist for a regulator while the surface is off', async ({
    server
  }) => {
    config.set('featureFlags.regulatorAccess', false)
    const { statusCode } = await visit(server, regulator)
    config.set('featureFlags.regulatorAccess', true)

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
