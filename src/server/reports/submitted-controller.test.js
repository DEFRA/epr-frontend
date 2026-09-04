import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { asRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
import { asReportDetailResponse } from '#server/common/test-helpers/report-fixtures.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByText,
  queryByRole,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const mockAuth = buildMockAuth()

const mockRegistration = asRegistrationWithAccreditation({
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG001234'
  },
  accreditation: undefined
})

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
const basePeriodPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1`
const submittedUrl = `${basePeriodPath}/submitted`
const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

describe('#submittedController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      mockRegistration
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetailResponse(mockReportDetail)
    )
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
        'Quarter 1 2026 report submitted to regulator'
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
        "you'll need to submit a new report for this period"
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

    describe('satisfaction survey', () => {
      const surveyUrl = 'https://survey.example/report'
      const surveyTitle = 'Help us improve this service'
      const surveyText = 'Give us your feedback (opens in a new tab)'

      const liveSurvey = () => {
        config.set('satisfactionSurvey.isEnabled', true)
        config.set('satisfactionSurvey.reportUrl', surveyUrl)
      }

      afterEach(() => {
        config.reset('satisfactionSurvey.isEnabled')
        config.reset('satisfactionSurvey.reportUrl')
      })

      const getBody = async (server) => {
        const { result } = await server.inject({
          method: 'GET',
          url: submittedUrl,
          auth: mockAuth
        })

        return new JSDOM(result, { url: 'http://localhost' }).window.document
          .body
      }

      it('asks nothing while the surveys are switched off', async ({
        server
      }) => {
        const body = await getBody(server)

        expect(queryByText(body, surveyTitle)).toBeNull()
      })

      it('asks below the page content, leaving the return link alone', async ({
        server
      }) => {
        liveSurvey()

        const body = await getBody(server)
        const main = getByRole(body, 'main')

        expect(getByText(body, surveyTitle)).toBeDefined()
        expect(queryByText(main, surveyTitle)).toBeNull()
        expect(
          getAllByRole(main, 'link').map((link) => link.textContent?.trim())
        ).toStrictEqual(['Return to your reports'])
      })

      it('does not introduce a what happens next heading', async ({
        server
      }) => {
        liveSurvey()

        const main = getByRole(await getBody(server), 'main')

        expect(
          queryByRole(main, 'heading', { name: 'What happens next' })
        ).toBeNull()
      })

      it('sends the user to the report survey, not one from another journey', async ({
        server
      }) => {
        liveSurvey()

        const body = await getBody(server)

        expect(
          getByRole(body, 'link', { name: surveyText }).getAttribute('href')
        ).toBe(surveyUrl)
      })
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
      vi.mocked(fetchReportDetail).mockResolvedValue(
        asReportDetailResponse({
          ...mockReportDetail,
          status: { currentStatus: 'ready_to_submit' }
        })
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: submittedUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should return 404 when status is in_progress', async ({ server }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        asReportDetailResponse({
          ...mockReportDetail,
          status: { currentStatus: 'in_progress' }
        })
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: submittedUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should return 404 when status is due', async ({ server }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        asReportDetailResponse({
          ...mockReportDetail,
          status: { currentStatus: 'due' }
        })
      )

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
        url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/invalid/1/submissions/1/submitted`,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.badRequest)
    })

    it('should return 400 for invalid year', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2023/quarterly/1/submissions/1/submitted`,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.badRequest)
    })

    it('should return 400 for invalid period', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/13/submissions/1/submitted`,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.badRequest)
    })
  })
})
