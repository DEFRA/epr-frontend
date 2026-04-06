import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import {
  extractCookieValues,
  mergeCookies
} from '#server/common/test-helpers/cookie-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

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

const organisationId = 'org-123'
const registrationId = 'reg-001'
const submittedUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submitted`
const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

const sessionPayload = { year: 2026, cadence: 'quarterly', period: 1 }

/**
 * Set reportSubmitted session data via a temporary test route,
 * then return cookies for subsequent requests.
 * The submit POST handler (Item 3) will do this in production.
 */
async function setSubmittedSession(server) {
  const helperPath = '/__test/set-report-submitted'

  server.route({
    method: 'GET',
    path: helperPath,
    options: { auth: false },
    handler(request, h) {
      request.yar.set('reportSubmitted', sessionPayload)
      return h.response('ok')
    }
  })

  const response = await server.inject({
    method: 'GET',
    url: helperPath
  })

  const cookieValues = extractCookieValues(response.headers['set-cookie'])
  return { cookies: mergeCookies(...cookieValues) }
}

describe('#submittedController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      mockRegistration
    )
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', true)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    describe('after report submission', () => {
      it('should return 200', async ({ server }) => {
        const { cookies } = await setSubmittedSession(server)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display confirmation panel with submitted heading', async ({
        server
      }) => {
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panel = body.querySelector('.govuk-panel--confirmation')

        expect(panel).not.toBeNull()
        expect(panel.textContent).toContain(
          'Quarter 1, 2026 report submitted to regulator'
        )
      })

      it('should not display status in confirmation panel', async ({
        server
      }) => {
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panel = body.querySelector('.govuk-panel--confirmation')

        expect(panel.textContent).not.toContain('Status:')
      })

      it('should display future changes guidance as inset text', async ({
        server
      }) => {
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const insetText = body.querySelector('.govuk-inset-text')

        expect(insetText).not.toBeNull()
        expect(insetText.textContent).toContain(
          'you may need to submit an updated report for this period'
        )
      })

      it('should display Details heading', async ({ server }) => {
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
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
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Registration:')
        expect(body.textContent).toContain('REG001234')
      })

      it('should display material', async ({ server }) => {
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Material:')
        expect(body.textContent).toContain('Plastic')
      })

      it('should display View report button linking to view page in new tab', async ({
        server
      }) => {
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const viewButton = getByRole(body, 'button', {
          name: /View report/
        })

        expect(viewButton).toBeDefined()
        expect(viewButton.textContent?.trim()).toBe(
          'View report (Opens in a new tab)'
        )
        expect(viewButton.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/view`
        )
        expect(viewButton.getAttribute('target')).toBe('_blank')
      })

      it('should display Return to reports link', async ({ server }) => {
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const returnLink = getByText(main, /Return to your reports/)

        expect(returnLink).toBeDefined()
        expect(returnLink.getAttribute('href')).toBe(reportsUrl)
      })

      it('should not display back link', async ({ server }) => {
        const { cookies } = await setSubmittedSession(server)

        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
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
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(reportsUrl)
      })

      it('should redirect on second visit after session is cleared', async ({
        server
      }) => {
        const { cookies } = await setSubmittedSession(server)

        const firstVisit = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: cookies }
        })

        expect(firstVisit.statusCode).toBe(statusCodes.ok)

        const updatedCookieValues = extractCookieValues(
          firstVisit.headers['set-cookie']
        )
        const updatedCookies = mergeCookies(cookies, ...updatedCookieValues)

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth,
          headers: { cookie: updatedCookies }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(reportsUrl)
      })
    })

    describe('param validation', () => {
      it('should return 400 for invalid cadence', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/invalid/1/submitted`,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid year', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2023/quarterly/1/submitted`,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid period', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/13/submitted`,
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
        url: submittedUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
