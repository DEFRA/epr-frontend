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

const registeredOnlyExporter = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'EX992415095748P'
  },
  accreditation: undefined
}

const reportDetail = {
  operatorCategory: 'EXPORTER_REGISTERED_ONLY',
  cadence: 'quarterly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-04-01T10:00:00.000Z' },
  details: { material: 'plastic' },
  id: 'report-001',
  version: 1,
  status: 'in_progress',
  supportingInformation: null,
  recyclingActivity: {
    totalTonnageReceived: 100,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  exportActivity: {
    overseasSites: [],
    unapprovedOverseasSites: [],
    totalTonnageExported: 10,
    tonnageReceivedNotExported: null,
    tonnageRefusedAtDestination: 0,
    tonnageStoppedDuringExport: 0,
    totalTonnageRefusedOrStopped: 0,
    tonnageRepatriated: 0
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const quarterlyUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/tonnes-not-exported`

describe('#tonnesNotExportedController', () => {
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
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 200 for registered-only exporter', async ({
        server
      }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display heading and hint text', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(result).toContain('Quarter 1 but not export')
        expect(result).toContain(
          'Only include packaging waste that is still on the site'
        )
      })

      it('should pre-fill saved tonnage', async ({ server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue({
          ...reportDetail,
          exportActivity: {
            ...reportDetail.exportActivity,
            tonnageReceivedNotExported: 42.5
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document
        const headingName =
          /How many tonnes of plastic packaging waste did you receive in Quarter 1 but not export\?/

        expect(getByRole(body, 'textbox', { name: headingName }).value).toBe(
          '42.5'
        )
      })

      it('should have back link to reports list', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(result).toContain(
          `/organisations/${organisationId}/registrations/${registrationId}/reports"`
        )
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
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 for accredited exporter', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
          ...registeredOnlyExporter,
          accreditation: { id: 'acc-001', accreditationNumber: 'ACC123' }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 for reprocessor', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
          ...registeredOnlyExporter,
          registration: {
            ...registeredOnlyExporter.registration,
            wasteProcessingType: 'reprocessor'
          }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })
    })

    describe('POST', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyExporter
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
        vi.mocked(updateReport).mockResolvedValue(undefined)
      })

      it('should redirect to supporting-information on continue', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: quarterlyUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, tonnageNotExported: 15.5, action: 'continue' }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/supporting-information`
        )
      })

      it('should redirect to reports list when save is clicked', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: quarterlyUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, tonnageNotExported: 0, action: 'save' }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
      })

      it('should redirect to reports list when save is clicked with empty tonnage', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: quarterlyUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, tonnageNotExported: '', action: 'save' }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
      })

      it('should not call updateReport when save is clicked with empty tonnage', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url: quarterlyUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, tonnageNotExported: '', action: 'save' }
        })

        expect(updateReport).not.toHaveBeenCalled()
      })

      it('should show error when save is clicked with non-numeric tonnage', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url: quarterlyUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, tonnageNotExported: 'abc', action: 'save' }
        })

        const { body } = new JSDOM(result).window.document
        const alert = getByRole(body, 'alert')

        expect(alert.textContent).toContain(
          'Enter the total tonnage in digits, using a decimal point if needed'
        )
      })

      it('should call updateReport with tonnageNotExported', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url: quarterlyUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, tonnageNotExported: 15.5, action: 'continue' }
        })

        expect(updateReport).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          2026,
          'quarterly',
          1,
          { tonnageNotExported: 15.5 },
          'mock-id-token'
        )
      })

      describe('validation errors', () => {
        it('should show error when tonnage is empty', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
            auth: mockAuth
          })

          const { result } = await server.inject({
            method: 'POST',
            url: quarterlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageNotExported: '', action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(alert.textContent).toContain(
            'Enter the total tonnage of packaging waste received but not exported'
          )
        })

        it('should show error when tonnage is non-numeric', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
            auth: mockAuth
          })

          const { result } = await server.inject({
            method: 'POST',
            url: quarterlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageNotExported: 'abc', action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(alert.textContent).toContain(
            'Enter the total tonnage in digits, using a decimal point if needed'
          )
        })

        it('should show error when tonnage has more than 2 decimal places', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
            auth: mockAuth
          })

          const { result } = await server.inject({
            method: 'POST',
            url: quarterlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageNotExported: 12.345, action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(alert.textContent).toContain(
            'Total tonnage should only have two digits after the decimal point'
          )
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
        url: quarterlyUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
