import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

/** @import { HapiServer } from '#server/common/hapi-types.js' */
/** @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js' */

vi.mock(import('./helpers/delete-report.js'))
vi.mock(import('./helpers/fetch-report-detail.js'))
vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const { deleteReport } = await import('./helpers/delete-report.js')
const { fetchReportDetail } = await import('./helpers/fetch-report-detail.js')
const { ReportStaleError, STALE_REASON } = await import('./helpers/stale.js')
const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')

const mockAuth = buildMockAuth()

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1/report-stale-error`
const periodUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1`

/**
 * Trigger the onPreResponse redirect to the error page, returning the
 * session cookie that carries the yar context set by the hook.
 * @param {HapiServer} server
 * @returns {Promise<string>}
 */
async function triggerStalenessRedirect(server) {
  const { headers } = await server.inject({
    method: 'GET',
    url: periodUrl,
    auth: mockAuth
  })
  const setCookies = headers['set-cookie']
  const cookies = Array.isArray(setCookies) ? setCookies : [setCookies]
  return cookies
    .filter(/** @returns {c is string} */ (c) => Boolean(c))
    .map((c) => c.split(';')[0])
    .join('; ')
}

describe('#reportStaleErrorController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      /** @type {RegistrationWithAccreditation} */ (
        /** @type {unknown} */ ({
          registration: { wasteProcessingType: 'reprocessor' },
          accreditation: undefined
        })
      )
    )
  })

  describe('GET', () => {
    describe('summary log changed only', () => {
      beforeEach(() => {
        vi.mocked(fetchReportDetail).mockRejectedValue(
          new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
        )
      })

      it('returns 200', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('displays the summary-log-changed page heading', async ({
        server
      }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const heading = getByRole(dom.window.document.body, 'heading', {
          name: /Your summary log has changed/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('displays both body paragraphs', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const paragraphs = dom.window.document.querySelectorAll(
          '.govuk-grid-column-two-thirds > p.govuk-body'
        )

        expect(paragraphs).toHaveLength(2)
        expect(paragraphs[0].textContent).toContain('newer version')
        expect(paragraphs[1].textContent).toContain('delete this report')
      })

      it('displays the warning delete button', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const button = dom.window.document.body.querySelector(
          '.govuk-button--warning'
        )

        expect(button).not.toBeNull()
        expect(button?.textContent?.trim()).toContain('Delete and start again')
        expect(button?.getAttribute('data-prevent-double-click')).toBe('true')
      })

      it('displays the return to reports secondary button', async ({
        server
      }) => {
        const cookie = await triggerStalenessRedirect(server)

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

        expect(button).toBeDefined()
        expect(button.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
        expect(button.classList.contains('govuk-button--secondary')).toBe(true)
      })

      it('redirects to reports landing page when accessed directly', async ({
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
    })

    describe('PRN cancelled only', () => {
      beforeEach(() => {
        vi.mocked(fetchReportDetail).mockRejectedValue(
          new ReportStaleError([STALE_REASON.PRN_CANCELLED])
        )
      })

      it('returns 200', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('displays the PRN-cancelled page heading', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const heading = getByRole(dom.window.document.body, 'heading', {
          name: /has been cancelled/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('names the note type as PRN for a reprocessor', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const heading = getByRole(dom.window.document.body, 'heading', {
          name: /A PRN has been cancelled/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('names the note type as PERN for an exporter', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          /** @type {RegistrationWithAccreditation} */ (
            /** @type {unknown} */ ({
              registration: { wasteProcessingType: 'exporter' },
              accreditation: undefined
            })
          )
        )
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const heading = getByRole(dom.window.document.body, 'heading', {
          name: /A PERN has been cancelled/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('displays both body paragraphs', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const paragraphs = dom.window.document.querySelectorAll(
          '.govuk-grid-column-two-thirds > p.govuk-body'
        )

        expect(paragraphs).toHaveLength(2)
        expect(paragraphs[0].textContent).toContain(
          'has been cancelled (or is awaiting cancellation)'
        )
        expect(paragraphs[1].textContent).toContain('delete this report')
      })

      it('displays the warning delete button', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const button = dom.window.document.body.querySelector(
          '.govuk-button--warning'
        )

        expect(button).not.toBeNull()
        expect(button?.textContent?.trim()).toContain('Delete and start again')
        expect(button?.getAttribute('data-prevent-double-click')).toBe('true')
      })

      it('displays the return to reports secondary button', async ({
        server
      }) => {
        const cookie = await triggerStalenessRedirect(server)

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

        expect(button).toBeDefined()
        expect(button.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
        expect(button.classList.contains('govuk-button--secondary')).toBe(true)
      })
    })

    describe('summary log changed and PRN cancelled', () => {
      beforeEach(() => {
        vi.mocked(fetchReportDetail).mockRejectedValue(
          new ReportStaleError([
            STALE_REASON.SUMMARY_LOG_CHANGED,
            STALE_REASON.PRN_CANCELLED
          ])
        )
      })

      it('returns 200', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('displays the combined "Something has happened" page heading', async ({
        server
      }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const heading = getByRole(dom.window.document.body, 'heading', {
          name: /Something has happened/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('displays both body paragraphs', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const paragraphs = dom.window.document.querySelectorAll(
          '.govuk-grid-column-two-thirds > p.govuk-body'
        )

        expect(paragraphs).toHaveLength(2)
        expect(paragraphs[0].textContent).toContain('newer version')
        expect(paragraphs[0].textContent).toContain(
          'has been cancelled (or is awaiting cancellation)'
        )
        expect(paragraphs[1].textContent).toContain('delete this report')
      })

      it('displays the warning delete button', async ({ server }) => {
        const cookie = await triggerStalenessRedirect(server)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie }
        })

        const dom = new JSDOM(result)
        const button = dom.window.document.body.querySelector(
          '.govuk-button--warning'
        )

        expect(button).not.toBeNull()
        expect(button?.textContent?.trim()).toContain('Delete and start again')
        expect(button?.getAttribute('data-prevent-double-click')).toBe('true')
      })

      it('displays the return to reports secondary button', async ({
        server
      }) => {
        const cookie = await triggerStalenessRedirect(server)

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

        expect(button).toBeDefined()
        expect(button.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
        expect(button.classList.contains('govuk-button--secondary')).toBe(true)
      })
    })
  })

  describe('POST', () => {
    beforeEach(() => {
      vi.mocked(deleteReport).mockResolvedValue(undefined)
      vi.mocked(fetchReportDetail).mockRejectedValue(
        new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
      )
    })

    it('rejects POST without CSRF token', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: baseUrl,
        auth: mockAuth,
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    it('calls deleteReport with the correct parameters', async ({ server }) => {
      const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
        auth: mockAuth
      })

      await server.inject({
        method: 'POST',
        url: baseUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: { crumb }
      })

      expect(deleteReport).toHaveBeenCalledWith(
        organisationId,
        registrationId,
        2026,
        'quarterly',
        1,
        1,
        'mock-id-token'
      )
    })

    it('redirects to the reports list after deletion', async ({ server }) => {
      const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
        auth: mockAuth
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: baseUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(
        `/organisations/${organisationId}/registrations/${registrationId}/reports`
      )
    })
  })
})
