import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

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
  status: { currentStatus: 'submitted' },
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
const submittedUrl = `${basePeriodPath}/submitted`
const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

describe('#submittedController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      mockRegistration
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(mockReportDetail)
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', true)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    describe('when report status is submitted', () => {
      it('should return 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display confirmation panel with submitted heading', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
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
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const panel = body.querySelector('.govuk-panel--confirmation')

        expect(panel.textContent).not.toContain('Status:')
      })

      it('should display future changes guidance as inset text', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
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
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
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
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Registration:')
        expect(body.textContent).toContain('REG001234')
      })

      it('should display material', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('Material:')
        expect(body.textContent).toContain('Plastic')
      })

      it('should display View report button linking to view page in new tab', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
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
        expect(viewButton.getAttribute('href')).toBe(`${basePeriodPath}/view`)
        expect(viewButton.getAttribute('target')).toBe('_blank')
      })

      it('should display Return to reports link', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')
        const returnLink = getByText(main, /Return to your reports/)

        expect(returnLink).toBeDefined()
        expect(returnLink.getAttribute('href')).toBe(reportsUrl)
      })

      it('should not display back link', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.querySelector('.govuk-back-link')).toBeNull()
      })

      it('should return 200 on refresh (repeated GET)', async ({ server }) => {
        const first = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })
        const second = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        expect(first.statusCode).toBe(statusCodes.ok)
        expect(second.statusCode).toBe(statusCodes.ok)
      })
    })

    describe('status guard', () => {
      it('should return 404 when status is ready_to_submit', async ({
        server
      }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue({
          ...mockReportDetail,
          status: { currentStatus: 'ready_to_submit' }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 when status is in_progress', async ({ server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue({
          ...mockReportDetail,
          status: { currentStatus: 'in_progress' }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 when status is due', async ({ server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue({
          ...mockReportDetail,
          status: { currentStatus: 'due' }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
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
