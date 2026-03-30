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
vi.mock(import('../helpers/update-report.js'))

const { updateReport } = await import('../helpers/update-report.js')

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

const accreditedExporter = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG001234'
  },
  accreditation: {
    id: 'acc-001',
    accreditationNumber: 'ER992415095748M'
  }
}

const registeredOnlyExporter = {
  ...accreditedExporter,
  accreditation: undefined
}

const accreditedReprocessor = {
  ...accreditedExporter,
  registration: {
    ...accreditedExporter.registration,
    wasteProcessingType: 'reprocessor'
  }
}

const reportDetail = {
  operatorCategory: 'EXPORTER_ACCREDITED',
  cadence: 'monthly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
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
  wasteSent: {
    tonnageSentToReprocessor: 5,
    tonnageSentToExporter: 3,
    tonnageSentToAnotherSite: 2,
    finalDestinations: []
  },
  prn: {
    tonnageIssued: 91,
    totalRevenue: null,
    averagePricePerTonne: null
  }
}

const reportDetailWithRevenue = {
  ...reportDetail,
  prn: {
    ...reportDetail.prn,
    totalRevenue: 1576.12
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/prn-summary`

describe('#prnSummaryController', () => {
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
          accreditedExporter
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 200 for accredited exporter with monthly cadence', async ({
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
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          level: 1
        })

        expect(heading.textContent).toContain('PERNs issued for')
      })

      it('should display tonnage issued', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(result).toContain('91')
      })

      it('should pre-fill revenue if previously saved', async ({ server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetailWithRevenue)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(result).toContain('1576.12')
      })

      it('should return 404 for non-accredited exporter', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyExporter
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 for accredited reprocessor', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedReprocessor
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 for quarterly cadence', async ({ server }) => {
        const quarterlyUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/prn-summary`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 500 when prn data is missing', async ({ server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue({
          ...reportDetail,
          prn: undefined
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.internalServerError)
      })

      it('should return 404 when report is not in progress', async ({
        server
      }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue({
          ...reportDetail,
          status: 'ready_to_submit'
        })

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
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedExporter
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
        vi.mocked(updateReport).mockResolvedValue(undefined)
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

      describe('when continue is clicked with valid revenue', () => {
        it('should redirect to free-perns', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, prnRevenue: 1576.12, action: 'continue' }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/free-perns`
          )
        })

        it('should call updateReport with prnRevenue', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, prnRevenue: 1576.12, action: 'continue' }
          })

          expect(updateReport).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            2026,
            'monthly',
            1,
            { prnRevenue: 1576.12 },
            'mock-id-token'
          )
        })
      })

      describe('when save is clicked', () => {
        it('should redirect to reports list', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, prnRevenue: 1576.12, action: 'save' }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports`
          )
        })
      })

      describe('validation errors', () => {
        it('should show error when revenue is non-numeric', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { statusCode, result } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, prnRevenue: 'abc', action: 'continue' }
          })

          expect(statusCode).toBe(statusCodes.ok)
          expect(result).toContain('Enter the total revenue of PERNs issued')
        })

        it('should show error when revenue is empty', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { statusCode, result } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, prnRevenue: '', action: 'continue' }
          })

          expect(statusCode).toBe(statusCodes.ok)
          expect(result).toContain('Enter the total revenue of PERNs issued')
        })
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
