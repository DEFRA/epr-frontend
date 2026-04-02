import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import {
  extractCookieValues,
  mergeCookies
} from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('./helpers/update-report-status.js'))

const { updateReportStatus } = await import('./helpers/update-report-status.js')

const mockAuth = {
  strategy: 'session',
  credentials: {
    profile: { id: 'user-123', email: 'test@example.com' },
    idToken: 'mock-id-token'
  }
}

const mockRegistration = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG001234'
  },
  accreditation: undefined
}

const mockReportDetail = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  dueDate: '2026-04-20',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-02-15T15:09:00.000Z' },
  details: { material: 'plastic' },
  id: 'report-001',
  version: 1,
  status: 'in_progress',
  supportingInformation: null,
  recyclingActivity: {
    totalTonnageReceived: 80.25,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  exportActivity: null,
  wasteSent: {
    tonnageSentToReprocessor: 0,
    tonnageSentToExporter: 0,
    tonnageSentToAnotherSite: 0,
    finalDestinations: []
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const basePeriodPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1`
const checkUrl = `${basePeriodPath}/check-your-answers`
const createdUrl = `${basePeriodPath}/created`
const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

/**
 * Go through the check-your-answers POST flow to establish reportCreated
 * session data, then return cookies for the subsequent GET to /created.
 */
async function createReportFlow(server) {
  const { cookie, crumb } = await getCsrfToken(server, checkUrl, {
    auth: mockAuth
  })

  const postResponse = await server.inject({
    method: 'POST',
    url: checkUrl,
    auth: mockAuth,
    headers: { cookie },
    payload: { crumb, version: 1 }
  })

  const postCookieValues = extractCookieValues(
    postResponse.headers['set-cookie']
  )
  const cookies = mergeCookies(cookie, ...postCookieValues)

  return { cookies }
}

describe('#createdController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      mockRegistration
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(mockReportDetail)
    vi.mocked(updateReportStatus).mockResolvedValue({ ok: true })
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', true)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    describe('after report creation', () => {
      it('should return 200', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display confirmation panel with period heading', async ({
        server
      }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panel = body.querySelector('.govuk-panel--confirmation')

        expect(panel).not.toBeNull()
        expect(panel.textContent).toContain('Quarter 1, 2026 report created')
      })

      it('should display status in confirmation panel', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panel = body.querySelector('.govuk-panel--confirmation')

        expect(panel.textContent).toContain('Status:')
        expect(panel.textContent).toContain('Ready to submit')
      })

      it('should display Details heading', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Details/,
          level: 2
        })

        expect(heading).toBeDefined()
      })

      it('should display registration number', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Registration:')
        expect(body.textContent).toContain('REG001234')
      })

      it('should display material', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Material:')
        expect(body.textContent).toContain('Plastic')
      })

      it('should display What happens next heading', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /What happens next/,
          level: 2
        })

        expect(heading).toBeDefined()
      })

      it('should display guidance with due date', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain(
          'submit the report to your regulator by 20 April 2026'
        )
      })

      it('should display self-submission guidance', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain(
          'you can submit it yourself through your reports page'
        )
      })

      it('should display Go to reports button linking to list', async ({
        server
      }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const button = getByText(main, /Go to reports/)

        expect(button).toBeDefined()
        expect(button.closest('a').getAttribute('href')).toBe(listUrl)
      })

      it('should display Return to home link', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const returnLink = getByText(main, /Return to home/)

        expect(returnLink).toBeDefined()
        expect(returnLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}`
        )
      })

      it('should not display back link', async ({ server }) => {
        const { cookies } = await createReportFlow(server)

        const { result } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.querySelector('.govuk-back-link')).toBeNull()
      })
    })

    describe('session guard', () => {
      it('should redirect to reports list when no session data', async ({
        server
      }) => {
        // Get valid cookies without going through the POST flow
        const { cookie } = await getCsrfToken(server, checkUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(listUrl)
      })

      it('should redirect on second visit after session is cleared', async ({
        server
      }) => {
        const { cookies } = await createReportFlow(server)

        // First visit renders the page and clears session
        const firstVisit = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(firstVisit.statusCode).toBe(statusCodes.ok)

        // Extract updated cookies (session may have changed)
        const updatedCookieValues = extractCookieValues(
          firstVisit.headers['set-cookie']
        )
        const updatedCookies = mergeCookies(cookies, ...updatedCookieValues)

        // Second visit — session data gone, should redirect
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: createdUrl,
          auth: mockAuth,
          headers: { cookie: updatedCookies }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(listUrl)
      })
    })

    describe('param validation', () => {
      it('should return 400 for invalid cadence', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/invalid/1/created`,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid year', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2023/quarterly/1/created`,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid period', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/13/created`,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })
    })
  })

  describe('when feature flag is disabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', false)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    it('should return 404', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: createdUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
