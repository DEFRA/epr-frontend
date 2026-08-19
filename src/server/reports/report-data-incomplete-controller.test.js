import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { asRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
import { asReportDetailResponse } from '#server/common/test-helpers/report-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

/** @import { HapiServer } from '#server/common/hapi-types.js' */

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('./helpers/fetch-report-detail.js'))
vi.mock(import('./helpers/create-report.js'))

const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
const { fetchReportDetail } = await import('./helpers/fetch-report-detail.js')
const { createReport } = await import('./helpers/create-report.js')

const mockAuth = buildMockAuth()

const organisationId = 'org-123'
const registrationId = 'reg-001'
const periodUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1`
const baseUrl = `${periodUrl}/report-data-incomplete`

const exporterRegistration = asRegistrationWithAccreditation({
  organisationData: { id: organisationId },
  registration: {
    id: registrationId,
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG001234'
  },
  accreditation: undefined
})

const reportDetail = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  source: { summaryLogId: null, lastUploadedAt: null },
  details: { material: 'plastic', site: { address: {} } },
  recyclingActivity: {
    totalTonnageReceived: 0,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 0,
    tonnageSentToExporter: 0,
    tonnageSentToAnotherSite: 0,
    finalDestinations: []
  }
}

/**
 * Drives a POST create that the backend rejects with a report_data_incomplete
 * 400, so the create-controller stores the issue payload in the session and
 * redirects here. Returns the cookie carrying that session for the GET.
 * @param {HapiServer} server
 * @param {{ total: number, issues: object[] }} payload
 * @returns {Promise<string>}
 */
async function triggerIncompleteRedirect(server, payload) {
  vi.mocked(createReport).mockRejectedValue({
    isBoom: true,
    output: {
      statusCode: statusCodes.badRequest,
      payload: { reason: 'report_data_incomplete', ...payload }
    }
  })

  const { cookie, crumb } = await getCsrfToken(server, periodUrl, {
    auth: mockAuth
  })
  const { headers } = await server.inject({
    method: 'POST',
    url: periodUrl,
    auth: mockAuth,
    headers: { cookie },
    payload: { crumb }
  })

  return refreshedCookie(headers['set-cookie']) || cookie
}

/**
 * Extracts the session cookie from a Set-Cookie response header, mirroring how
 * a browser updates its jar between requests.
 * @param {string | string[] | undefined} setCookies
 * @returns {string}
 */
function refreshedCookie(setCookies) {
  return (Array.isArray(setCookies) ? setCookies : [setCookies])
    .filter(/** @returns {c is string} */ (c) => Boolean(c))
    .map((c) => c.split(';')[0])
    .join('; ')
}

const twoIssues = {
  total: 2,
  issues: [
    { sheet: 'Exported', rowId: '1001', field: 'SUPPLIER_NAME' },
    { sheet: 'Sent on', rowId: '4001', field: 'FINAL_DESTINATION_NAME' }
  ]
}

describe('#reportDataIncompleteController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      exporterRegistration
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetailResponse(reportDetail)
    )
  })

  it('returns 200', async ({ server }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
  })

  it('displays the plural fix-issues heading', async ({ server }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const heading = getByRole(dom.window.document.body, 'heading', {
      name: /You need to fix these summary log issues before you can create this draft/,
      level: 1
    })

    expect(heading).toBeDefined()
  })

  it('displays the count line', async ({ server }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    expect(result).toContain('We found 2 issues in your summary log.')
  })

  it('displays the create-report caption', async ({ server }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const caption = dom.window.document.querySelector('.govuk-caption-xl')

    expect(caption?.textContent?.trim()).toBe('Create report')
  })

  it('renders the content at full width', async ({ server }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    expect(result).toContain('govuk-grid-column-full')
    expect(result).not.toContain('govuk-grid-column-two-thirds')
  })

  it('displays the plural help line with a mailto link', async ({ server }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const link = dom.window.document.querySelector('a[href^="mailto:"]')

    expect(dom.window.document.body.textContent).toContain(
      'If you need help to fix these issues, email'
    )
    expect(link?.getAttribute('href')).toBe(
      'mailto:eprcustomerservice@defra.gov.uk'
    )
  })

  it('shows a back link to the reports list', async ({ server }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const backLink = dom.window.document.querySelector('.govuk-back-link')

    expect(backLink?.getAttribute('href')).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/reports`
    )
  })

  it('links "choose the file again" to the summary log upload page', async ({
    server
  }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const link = getByRole(dom.window.document.body, 'link', {
      name: /choose the file again/
    })

    expect(link.getAttribute('href')).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
    )
  })

  it('groups issues by worksheet with field-specific bullets', async ({
    server
  }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const worksheetHeadings = [
      ...dom.window.document.querySelectorAll('h2.govuk-heading-m')
    ].map((h) => h.textContent?.trim())
    const bullets = [
      ...dom.window.document.querySelectorAll('ul.govuk-list--bullet li')
    ].map((li) => li.textContent?.trim())

    expect(worksheetHeadings).toStrictEqual(['Exported', 'Sent on'])
    expect(bullets).toStrictEqual([
      'Row ID: 1001. Supplier name is missing',
      'Row ID: 4001. Final destination facility name is missing'
    ])
  })

  it('collects issues that share a worksheet under one heading', async ({
    server
  }) => {
    const cookie = await triggerIncompleteRedirect(server, {
      total: 2,
      issues: [
        { sheet: 'Exported', rowId: '1001', field: 'SUPPLIER_NAME' },
        { sheet: 'Exported', rowId: '1001', field: 'DATE_OF_EXPORT' }
      ]
    })

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const worksheetHeadings = [
      ...dom.window.document.querySelectorAll('h2.govuk-heading-m')
    ].map((h) => h.textContent?.trim())

    expect(worksheetHeadings).toStrictEqual(['Exported'])
  })

  it('displays the singular heading and count for a single issue', async ({
    server
  }) => {
    const cookie = await triggerIncompleteRedirect(server, {
      total: 1,
      issues: [{ sheet: 'Exported', rowId: '1001', field: 'OSR_ID' }]
    })

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const heading = getByRole(dom.window.document.body, 'heading', {
      name: /You need to fix this summary log issue before you can create this draft/,
      level: 1
    })

    expect(heading).toBeDefined()
    expect(result).toContain('We found 1 issue in your summary log.')
    expect(dom.window.document.body.textContent).toContain(
      'If you need help to fix this issue, email'
    )
  })

  it('shows the capped count line when the true total exceeds the issues listed', async ({
    server
  }) => {
    const cookie = await triggerIncompleteRedirect(server, {
      total: 150,
      issues: [
        { sheet: 'Exported', rowId: '1001', field: 'SUPPLIER_NAME' },
        { sheet: 'Exported', rowId: '1002', field: 'OSR_ID' }
      ]
    })

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    expect(result).toContain(
      'We found 150 issues in your summary log, but can only display 2 of them at the moment.'
    )
  })

  it('falls back to the raw field code when no label copy exists', async ({
    server
  }) => {
    const cookie = await triggerIncompleteRedirect(server, {
      total: 1,
      issues: [{ sheet: 'Exported', rowId: '1001', field: 'MYSTERY_FIELD' }]
    })

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    expect(result).toContain('Row ID: 1001. MYSTERY_FIELD is missing')
  })

  it('links "Return to reports" to the reports list', async ({ server }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const button = getByRole(dom.window.document.body, 'button', {
      name: /Return to reports/
    })

    expect(button.getAttribute('href')).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/reports`
    )
    expect(button.classList.contains('govuk-button--secondary')).toBe(true)
  })

  it('links "Upload a new summary log" to the summary log upload page', async ({
    server
  }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const { result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const dom = new JSDOM(result)
    const button = getByRole(dom.window.document.body, 'button', {
      name: /Upload a new summary log/
    })

    expect(button.getAttribute('href')).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
    )
  })

  it('redirects to the reports list when accessed directly', async ({
    server
  }) => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/reports`
    )
  })

  it('does not render the screen a second time after a refresh', async ({
    server
  }) => {
    const cookie = await triggerIncompleteRedirect(server, twoIssues)

    const firstView = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie }
    })

    const clearedCookie = refreshedCookie(firstView.headers['set-cookie'])

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth,
      headers: { cookie: clearedCookie }
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(
      `/organisations/${organisationId}/registrations/${registrationId}/reports`
    )
  })
})
