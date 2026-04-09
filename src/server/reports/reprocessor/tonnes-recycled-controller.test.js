import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
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

const reprocessorRegistration = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    registrationNumber: 'REG001234'
  },
  accreditation: {
    id: 'acc-001',
    accreditationNumber: 'ER992415095748M'
  }
}

const registeredOnlyReprocessor = {
  ...reprocessorRegistration,
  accreditation: undefined
}

const exporterRegistration = {
  ...reprocessorRegistration,
  registration: {
    ...reprocessorRegistration.registration,
    wasteProcessingType: 'exporter'
  }
}

const reportDetail = {
  operatorCategory: 'REPROCESSOR_ACCREDITED',
  cadence: 'monthly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-02-15T15:09:00.000Z' },
  details: { material: 'plastic' },
  id: 'report-001',
  version: 1,
  status: 'in_progress',
  supportingInformation: null,
  recyclingActivity: {
    totalTonnageReceived: 200,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  }
}

const reportDetailWithTonnage = {
  ...reportDetail,
  recyclingActivity: {
    ...reportDetail.recyclingActivity,
    tonnageRecycled: 150.5
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/tonnes-recycled`

describe('#tonnesRecycledController', () => {
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
          reprocessorRegistration
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 200 for reprocessor with monthly cadence', async ({
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

        expect(heading.textContent).toContain('packaging waste did you recycle')
      })

      it('should display hint text', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(result).toContain('This total may differ from the')
      })

      it('should pre-fill tonnage if previously saved', async ({ server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetailWithTonnage)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(result).toContain('value="150.5"')
      })

      it('should return 200 for registered-only reprocessor', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyReprocessor
        )

        const quarterlyUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/tonnes-recycled`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should return 404 for exporter registration', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          exporterRegistration
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
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
          reprocessorRegistration
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

      describe('when continue is clicked with valid tonnage', () => {
        it('should redirect to tonnes-not-recycled', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageRecycled: 100.5, action: 'continue' }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/tonnes-not-recycled`
          )
        })

        it('should call updateReport with tonnageRecycled', async ({
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
            payload: { crumb, tonnageRecycled: 100.5, action: 'continue' }
          })

          expect(updateReport).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            2026,
            'monthly',
            1,
            { tonnageRecycled: 100.5 },
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
            payload: { crumb, tonnageRecycled: 0, action: 'save' }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports`
          )
        })
      })

      describe('validation errors', () => {
        it('should show error when tonnage is empty', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { result } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageRecycled: '', action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(
            getByText(
              alert,
              /Enter the total tonnage of packaging waste recycled/
            )
          ).toBeDefined()
        })

        it('should show error when tonnage is non-numeric', async ({
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
            payload: { crumb, tonnageRecycled: 'abc', action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(
            getByText(
              alert,
              /Enter the total tonnage in digits, using a decimal point if needed/
            )
          ).toBeDefined()
        })

        it('should show error when tonnage has more than 2 decimal places', async ({
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
            payload: { crumb, tonnageRecycled: 12.345, action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(
            getByText(
              alert,
              /Total tonnage should only have two digits after the decimal point/
            )
          ).toBeDefined()
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
