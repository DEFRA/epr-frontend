import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('./helpers/delete-report.js'))

const { deleteReport } = await import('./helpers/delete-report.js')

const mockCredentials = {
  profile: {
    id: 'user-123',
    email: 'test@example.com'
  },
  idToken: 'mock-id-token'
}

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const registeredOnlyExporter = {
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
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/delete`

describe('#deleteController', () => {
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
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyExporter
        )
      })

      it('should return 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display the confirmation heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Confirm deletion of this report/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('should display the warning button', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const button = body.querySelector('.govuk-button--warning')

        expect(button).not.toBeNull()
        expect(button?.textContent?.trim()).toContain('Confirm deletion')
      })

      it('should display back link to supporting information page', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')

        expect(backLink).not.toBeNull()
        expect(backLink?.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/supporting-information`
        )
      })

      it('should display the warning and guidance text', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const paragraphs = body.querySelectorAll(
          '.govuk-grid-column-two-thirds > p.govuk-body'
        )

        expect(paragraphs).toHaveLength(2)
        expect(paragraphs[0].textContent).toContain('cannot be undone')
        expect(paragraphs[1].textContent).toContain(
          'start creating the report again'
        )
      })
    })

    describe('POST', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyExporter
        )
        vi.mocked(deleteReport).mockResolvedValue({ ok: true })
      })

      describe('csrf protection', () => {
        it('should reject POST without CSRF token', async ({ server }) => {
          const { statusCode } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            payload: {}
          })

          expect(statusCode).toBe(statusCodes.forbidden)
        })
      })

      describe('when confirm deletion is clicked', () => {
        it('should call deleteReport and redirect to reports list', async ({
          server
        }) => {
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

        it('should call deleteReport with correct parameters', async ({
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
      })
    })

    describe('when deleteReport fails', () => {
      it('should propagate the error', async ({ server }) => {
        vi.mocked(deleteReport).mockRejectedValue(
          Object.assign(new Error('Backend error'), {
            isBoom: true,
            output: { statusCode: 500 }
          })
        )

        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        const { statusCode } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb }
        })

        expect(statusCode).toBe(statusCodes.internalServerError)
      })
    })

    describe('param validation', () => {
      it('should return 400 for invalid cadence', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/invalid/1/delete`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid year', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2023/quarterly/1/delete`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid period', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/13/delete`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
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
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
