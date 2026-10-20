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

const registrationPath = '/organisations/500118/registrations/R26ER5001180041PL'
const accreditationPath = `${registrationPath}/accreditations/2026`
const path = `${accreditationPath}/reports`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {number} period
 * @param {{ submitted: boolean, year?: number }} options
 * @returns {ReportListDetails['reportingPeriods'][number]}
 */
const aPeriod = (period, { submitted, year = 2026 }) =>
  /** @type {ReportListDetails['reportingPeriods'][number]} */ (
    /** @type {unknown} */ ({
      year,
      period,
      submissionNumber: 1,
      dueDate: '2026-09-20',
      periodStatus: submitted ? 'submitted' : 'overdue',
      report: submitted ? { submittedAt: '2026-09-15T15:09:00.000Z' } : null
    })
  )

/** @type {ReportListDetails} */
const details = {
  organisation: {
    organisationNumber: 500118,
    name: 'Kirkby Plastics Ltd',
    displayName: 'Kirkby Plastics Ltd',
    registrations: {}
  },
  accreditation: {
    accreditationNumber: 'A26ER5001180114PL',
    status: {
      current: 'approved',
      timeline: { '2026-01-01T09:00:00.000Z': { status: 'approved' } }
    }
  },
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
 * @param {string} [url]
 */
const visit = async (server, auth, url = path) => {
  const response = await server.inject({ method: 'GET', url, auth })

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
    expect(fetchReportListDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationNumber: '500118',
        registrationNumber: 'R26ER5001180041PL',
        year: '2026'
      })
    )
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

  it.for([
    { year: 2025, months: ['May, 2025', 'April, 2025'], periods: [5, 4] },
    { year: 2026, months: ['August, 2026', 'June, 2026'], periods: [8, 6] }
  ])(
    'lists only the periods of $year, each linked under $year, where the calendar spans years',
    async ({ year, months, periods }, { server }) => {
      vi.mocked(fetchReportListDetails).mockResolvedValue({
        ...details,
        reportingPeriods: [
          aPeriod(4, { submitted: true, year: 2025 }),
          aPeriod(8, { submitted: true }),
          aPeriod(5, { submitted: true, year: 2025 }),
          aPeriod(6, { submitted: true })
        ]
      })

      const reportsPath = `${registrationPath}/accreditations/${year}/reports`
      const { body } = await visit(server, regulator, reportsPath)
      const [, ...rows] = getAllByRole(reportsTable(body), 'row')

      expect(
        rows.map((row) =>
          within(row).getByRole('rowheader').textContent?.trim()
        )
      ).toStrictEqual(months)
      expect(
        getAllByRole(reportsTable(body), 'link').map((link) =>
          link.getAttribute('href')
        )
      ).toStrictEqual(
        periods.map(
          (period) => `${reportsPath}/monthly/${period}/submissions/1/view`
        )
      )
    }
  )

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
      `${accreditationPath}/reports/monthly/8/submissions/1/view`
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
    expect(
      crumbs
        .slice(1, 4)
        .map((crumb) => crumb.querySelector('a')?.getAttribute('href'))
    ).toStrictEqual([
      '/organisations/500118',
      '/organisations/500118/registrations/R26ER5001180041PL',
      accreditationPath
    ])
    expect(crumbs.at(4)?.querySelector('a')).toBeNull()
  })

  it('walks back by the breadcrumbs, with no back link', async ({ server }) => {
    const { body } = await visit(server, regulator)
    const document = documentOf(body)
    const crumbs = [
      ...document.querySelectorAll('.govuk-breadcrumbs__list-item')
    ]

    expect(document.querySelector('.govuk-back-link')).toBeNull()
    expect(crumbs.at(-2)?.querySelector('a')?.getAttribute('href')).toBe(
      accreditationPath
    )
    expect(crumbs.at(-1)?.textContent?.trim()).toBe('Reports')
    expect(crumbs.at(-1)?.querySelector('a')).toBeNull()
    expect(getByTestId(document, 'reports-detailed-view')).toBeDefined()
  })

  it('titles the page by the accreditation number', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(documentOf(body).ownerDocument.title).toContain(
      'A26ER5001180114PL: Reports'
    )
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

  it('does not exist for an organisation number that is not digits', async ({
    server
  }) => {
    const { statusCode } = await visit(
      server,
      regulator,
      '/organisations/500118x/registrations/R26ER5001180041PL/accreditations/2026/reports'
    )

    expect(statusCode).toBe(statusCodes.notFound)
    expect(fetchReportListDetails).not.toHaveBeenCalled()
  })

  it('does not exist for a year outside the range the service answers for', async ({
    server
  }) => {
    const { statusCode } = await visit(
      server,
      regulator,
      `${registrationPath}/accreditations/1999/reports`
    )

    expect(statusCode).toBe(statusCodes.notFound)
    expect(fetchReportListDetails).not.toHaveBeenCalled()
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
