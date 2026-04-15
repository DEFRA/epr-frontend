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

const reportDetail = {
  operatorCategory: 'EXPORTER_ACCREDITED',
  cadence: 'monthly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-02-15T15:09:00.000Z' },
  details: { material: 'plastic' },
  id: 'report-001',
  version: 1,
  status: { currentStatus: 'in_progress' },
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
    issuedTonnage: 91,
    totalRevenue: 1576.12,
    averagePricePerTonne: 17.32,
    freeTonnage: null
  }
}

const reportDetailWithFreeTonnage = {
  ...reportDetail,
  prn: {
    ...reportDetail.prn,
    freeTonnage: 5
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/free-perns`

describe('#freePernController', () => {
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

      it('should set the page title', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const { title } = new JSDOM(result).window.document
        expect(title).toContain('Free PERNs: Plastic: January 2026')
      })

      it('should display the heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document

        expect(
          getByRole(body, 'heading', {
            level: 1,
            name: /What is the total tonnage of PERNs you issued for free in January\?/
          })
        ).toBeDefined()
      })

      it('should display inset hint, input label, and input hint', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document
        const inset = body.querySelector('.govuk-inset-text')

        expect(inset).not.toBeNull()
        expect(
          getByText(
            inset,
            /you may have issued PERNs to your own company for no charge/
          )
        ).toBeDefined()
        expect(
          getByText(body, /Enter total tonnage of PERNs issued for free/)
        ).toBeDefined()
        expect(
          getByText(
            body,
            /Total tonnage should be a whole number without decimal numbers/
          )
        ).toBeDefined()
      })

      it('should pre-fill tonnage if previously saved', async ({ server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue(
          reportDetailWithFreeTonnage
        )

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(result).toContain('value="5"')
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

      it('should return 404 for quarterly cadence', async ({ server }) => {
        const quarterlyUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/free-perns`

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
          status: { currentStatus: 'ready_to_submit' }
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

      describe('when continue is clicked with valid tonnage', () => {
        it('should redirect to supporting-information', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, freeTonnage: 5, action: 'continue' }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/supporting-information`
          )
        })

        it('should call updateReport with freeTonnage', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
            auth: mockAuth
          })

          await server.inject({
            method: 'POST',
            url: baseUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, freeTonnage: 5, action: 'continue' }
          })

          expect(updateReport).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            2026,
            'monthly',
            1,
            { freeTonnage: 5 },
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
            payload: { crumb, freeTonnage: 0, action: 'save' }
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
            payload: { crumb, freeTonnage: '', action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(
            getByText(
              alert,
              /Enter the total tonnage of PERNs issued for free, even if zero/
            )
          ).toBeDefined()
        })

        it('should show error when tonnage exceeds total PERNs issued', async ({
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
            payload: { crumb, freeTonnage: 100, action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(
            getByText(
              alert,
              /This number should be less than the total number of PERNs you issued in January$/
            )
          ).toBeDefined()
        })

        it.for([
          { scenario: 'is not a whole number', value: 12.5 },
          { scenario: 'is non-numeric', value: 'abc' }
        ])(
          'should show digits-only error when tonnage $scenario',
          async ({ value }, { server }) => {
            const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
              auth: mockAuth
            })

            const { result } = await server.inject({
              method: 'POST',
              url: baseUrl,
              auth: mockAuth,
              headers: { cookie },
              payload: { crumb, freeTonnage: value, action: 'continue' }
            })

            const { body } = new JSDOM(result).window.document
            const alert = getByRole(body, 'alert')

            expect(
              getByText(
                alert,
                /Enter the total tonnage in digits, using only a whole number/
              )
            ).toBeDefined()
          }
        )
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
