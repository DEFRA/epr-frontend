import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { asRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

const CLOSED_PERIOD_FLAG = 'featureFlags.closedPeriodAdjustments'
const OPERATOR_RESUBMISSION_FLAG = 'featureFlags.operatorInitiatedResubmission'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('./helpers/fetch-report-detail.js'))
vi.mock(import('./helpers/request-resubmission.js'))

const { requestResubmission } =
  await import('./helpers/request-resubmission.js')

const mockCredentials = buildMockAuth().credentials
const mockAuth = { strategy: 'session', credentials: mockCredentials }

const registeredOnlyExporter = asRegistrationWithAccreditation({
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG001234'
  },
  accreditation: undefined
})

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1/make-changes`
const viewPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1/view`
const nextSubmissionPeriodPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/2`

/**
 * @param {Partial<ReportDetailResponse['status']>} status
 * @param {boolean} canRequestResubmission
 * @returns {ReportDetailResponse}
 */
function buildReportDetail(status, canRequestResubmission) {
  return /** @type {ReportDetailResponse} */ ({
    status,
    canRequestResubmission
  })
}

const submittedEligibleReportDetail = buildReportDetail(
  { currentStatus: 'submitted' },
  true
)

describe('#makeChangesController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    config.set(CLOSED_PERIOD_FLAG, true)
    config.set(OPERATOR_RESUBMISSION_FLAG, true)
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      registeredOnlyExporter
    )
  })

  afterEach(() => {
    config.reset(CLOSED_PERIOD_FLAG)
    config.reset(OPERATOR_RESUBMISSION_FLAG)
  })

  describe('GET', () => {
    beforeEach(() => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        submittedEligibleReportDetail
      )
    })

    it('should return 200 when the report is submitted and eligible', async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should display the heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const heading = getByRole(dom.window.document.body, 'heading', {
        name: /If you continue, you.ll need to resubmit this report/,
        level: 1
      })

      expect(heading).toBeDefined()
    })

    it('should display both choice buttons and the cancel link', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      expect(getByText(body, "Use this report's summary log")).toBeDefined()
      expect(getByText(body, 'Upload new summary log')).toBeDefined()
      expect(getByRole(body, 'link', { name: 'Cancel' })).toBeDefined()
    })

    it('should link the upload button to the summary log upload page', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const uploadLink = getByRole(dom.window.document.body, 'button', {
        name: 'Upload new summary log'
      })

      expect(uploadLink.getAttribute('href')).toBe(
        `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
      )
    })

    it('should return 404 when the report is not submitted', async ({
      server
    }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        buildReportDetail({ currentStatus: 'in_progress' }, true)
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should return 404 when the report cannot request resubmission', async ({
      server
    }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        buildReportDetail({ currentStatus: 'submitted' }, false)
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('POST', () => {
    beforeEach(() => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        submittedEligibleReportDetail
      )
      vi.mocked(requestResubmission).mockResolvedValue(
        /** @type {void} */ (
          /** @type {unknown} */ ({ status: 'requires_resubmission' })
        )
      )
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

    describe('when "Use this report\'s summary log" is clicked', () => {
      it('should call requestResubmission and redirect to the next submission period path', async ({
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
        expect(headers.location).toBe(nextSubmissionPeriodPath)
      })

      it('should call requestResubmission with correct parameters', async ({
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

        expect(requestResubmission).toHaveBeenCalledWith(
          {
            organisationId,
            registrationId,
            year: 2026,
            cadence: 'quarterly',
            period: 1,
            submissionNumber: 1
          },
          'mock-id-token'
        )
      })
    })

    describe('when the report is no longer eligible', () => {
      it('should redirect to the view page instead of erroring', async ({
        server
      }) => {
        vi.mocked(requestResubmission).mockRejectedValue(
          Object.assign(new Error('Conflict'), {
            isBoom: true,
            output: {
              statusCode: 409,
              payload: { code: 'resubmission_already_requested' }
            }
          })
        )

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
        expect(headers.location).toBe(viewPath)
      })
    })

    describe('when requestResubmission fails for another reason', () => {
      it('should propagate the error', async ({ server }) => {
        vi.mocked(requestResubmission).mockRejectedValue(
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
  })

  describe('param validation', () => {
    it('should return 400 for invalid cadence', async ({ server }) => {
      const invalidUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/invalid/1/submissions/1/make-changes`

      const { statusCode } = await server.inject({
        method: 'GET',
        url: invalidUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.badRequest)
    })
  })

  describe('guards', () => {
    beforeEach(() => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        submittedEligibleReportDetail
      )
    })

    it('GET should return 404 when the operator-initiated-resubmission flag is off', async ({
      server
    }) => {
      config.set(OPERATOR_RESUBMISSION_FLAG, false)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('GET should return 404 when the closed-period-adjustments flag is off', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, false)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('POST should return 404 when the operator-initiated-resubmission flag is off', async ({
      server
    }) => {
      const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
        auth: mockAuth
      })
      config.set(OPERATOR_RESUBMISSION_FLAG, false)

      const { statusCode } = await server.inject({
        method: 'POST',
        url: baseUrl,
        auth: mockAuth,
        headers: { cookie },
        payload: { crumb }
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})

/**
 * @import { ReportDetailResponse } from './helpers/fetch-report-detail.js'
 */
