import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(import('./helpers/delete-report.js'))

const { deleteReport } = await import('./helpers/delete-report.js')

const mockAuth = buildMockAuth()

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/summary-log-changed-error`

describe('#summaryLogChangedErrorController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', true)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    describe('GET', () => {
      it('returns 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('displays the page heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const heading = getByRole(dom.window.document.body, 'heading', {
          name: /Your summary log has changed/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('displays both body paragraphs', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
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
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const button = dom.window.document.body.querySelector(
          '.govuk-button--warning'
        )

        expect(button).not.toBeNull()
        expect(button?.textContent?.trim()).toContain('Delete and start again')
        expect(button?.getAttribute('data-prevent-double-click')).toBe('true')
      })
    })

    describe('POST', () => {
      beforeEach(() => {
        vi.mocked(deleteReport).mockResolvedValue(undefined)
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

      it('calls deleteReport with the correct parameters', async ({
        server
      }) => {
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
})
