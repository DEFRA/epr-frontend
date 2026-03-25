import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('./helpers/update-report.js'))

const { updateReport } = await import('./helpers/update-report.js')

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

const reportDetailWithoutSupportingInfo = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  lastUploadedAt: '2026-02-15T15:09:00.000Z',
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
  exportActivity: {
    totalTonnageReceivedForExporting: 50,
    overseasSites: [],
    tonnageReceivedNotExported: null,
    tonnageRefusedAtRecepientDestination: null,
    tonnageStoppedDuringExport: null,
    tonnageRepatriated: null
  },
  wasteSent: {
    tonnageSentToReprocessor: 5,
    tonnageSentToExporter: 3,
    tonnageSentToAnotherSite: 2,
    finalDestinations: []
  }
}

const reportDetailWithSupportingInfo = {
  ...reportDetailWithoutSupportingInfo,
  supportingInformation: 'Supply chain disruption in February'
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/supporting-information`

describe('#supportingInformationController', () => {
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

      describe('when no supporting information has been saved', () => {
        beforeEach(() => {
          vi.mocked(fetchReportDetail).mockResolvedValue(
            reportDetailWithoutSupportingInfo
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

        it('should display the page heading', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const heading = getByRole(body, 'heading', {
            name: /Add supporting information for your regulator/,
            level: 1
          })

          expect(heading).toBeDefined()
        })

        it('should display the Create report caption', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const caption = body.querySelector('.govuk-caption-l')

          expect(caption).not.toBeNull()
          expect(caption?.textContent).toContain('Create report')
        })

        it('should render a character count textarea', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const characterCount = body.querySelector('.govuk-character-count')

          expect(characterCount).not.toBeNull()
        })

        it('should render the textarea with empty value', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const textarea = body.querySelector('#supportingInformation')

          expect(textarea).not.toBeNull()
          expect(textarea?.textContent).toBe('')
        })

        it('should render Continue and Save buttons', async ({ server }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const continueButton = body.querySelector('button[value="continue"]')
          const saveButton = body.querySelector('button[value="save"]')

          expect(continueButton).not.toBeNull()
          expect(continueButton?.textContent?.trim()).toContain('Continue')
          expect(saveButton).not.toBeNull()
          expect(saveButton?.textContent?.trim()).toContain(
            'Save and come back later'
          )
        })

        it('should display back link to detail page', async ({ server }) => {
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
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1`
          )
        })
      })

      describe('when supporting information has been saved previously', () => {
        beforeEach(() => {
          vi.mocked(fetchReportDetail).mockResolvedValue(
            reportDetailWithSupportingInfo
          )
        })

        it('should pre-populate the textarea with saved text', async ({
          server
        }) => {
          const { result } = await server.inject({
            method: 'GET',
            url: baseUrl,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const textarea = body.querySelector('#supportingInformation')

          expect(textarea?.textContent).toBe(
            'Supply chain disruption in February'
          )
        })
      })
    })

    describe('POST', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyExporter
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(
          reportDetailWithoutSupportingInfo
        )
        vi.mocked(updateReport).mockResolvedValue({ ok: true })
      })

      describe('csrf protection', () => {
        it('should reject POST without CSRF token', async ({ server }) => {
          const { statusCode } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            payload: {
              supportingInformation: 'notes',
              action: 'continue'
            }
          })

          expect(statusCode).toBe(statusCodes.forbidden)
        })
      })

      describe('when action is continue', () => {
        it('should save supporting information and redirect to check page', async ({
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
            payload: {
              supportingInformation: 'Notes for regulator',
              action: 'continue',
              crumb
            }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/check-your-answers`
          )
        })

        it('should call updateReport with correct parameters', async ({
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
            payload: {
              supportingInformation: 'Notes for regulator',
              action: 'continue',
              crumb
            }
          })

          expect(updateReport).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            2026,
            'quarterly',
            1,
            { supportingInformation: 'Notes for regulator' },
            'mock-id-token'
          )
        })

        it('should save empty string when textarea is blank', async ({
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
            payload: {
              supportingInformation: '',
              action: 'continue',
              crumb
            }
          })

          expect(updateReport).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            2026,
            'quarterly',
            1,
            { supportingInformation: '' },
            'mock-id-token'
          )
        })
      })

      describe('when action is save', () => {
        it('should save supporting information and redirect to list page', async ({
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
            payload: {
              supportingInformation: 'Partial notes',
              action: 'save',
              crumb
            }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports`
          )
        })

        it('should call updateReport with correct parameters', async ({
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
            payload: {
              supportingInformation: 'Partial notes',
              action: 'save',
              crumb
            }
          })

          expect(updateReport).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            2026,
            'quarterly',
            1,
            { supportingInformation: 'Partial notes' },
            'mock-id-token'
          )
        })
      })

      describe('validation', () => {
        it('should re-render with error when text exceeds 2000 characters', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const longText = 'a'.repeat(2001)

          const { result, statusCode } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: {
              supportingInformation: longText,
              action: 'continue',
              crumb
            }
          })

          expect(statusCode).toBe(statusCodes.ok)

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const errorSummary = body.querySelector('.govuk-error-summary')
          expect(errorSummary).not.toBeNull()
        })

        it('should preserve entered text when validation fails', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const longText = 'a'.repeat(2001)

          const { result } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: {
              supportingInformation: longText,
              action: 'continue',
              crumb
            }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const textarea = body.querySelector('#supportingInformation')
          expect(textarea?.textContent).toBe(longText)
        })

        it('should display inline error on textarea field', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { result } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: {
              supportingInformation: 'a'.repeat(2001),
              action: 'continue',
              crumb
            }
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const inlineError = body.querySelector('#supportingInformation-error')
          expect(inlineError).not.toBeNull()
        })

        it('should not call backend when validation fails', async ({
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
            payload: {
              supportingInformation: 'a'.repeat(2001),
              action: 'continue',
              crumb
            }
          })

          expect(updateReport).not.toHaveBeenCalled()
        })

        it('should accept exactly 2000 characters', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { statusCode } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: {
              supportingInformation: 'a'.repeat(2000),
              action: 'continue',
              crumb
            }
          })

          expect(statusCode).toBe(statusCodes.found)
        })
      })
    })

    describe('param validation', () => {
      it('should return 400 for invalid cadence', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/invalid/1/supporting-information`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid year', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2023/quarterly/1/supporting-information`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: invalidUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      it('should return 400 for invalid period', async ({ server }) => {
        const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/13/supporting-information`

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
