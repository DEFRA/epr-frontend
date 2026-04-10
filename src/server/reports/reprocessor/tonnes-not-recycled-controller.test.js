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
    tonnageNotRecycled: 89.3
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const monthlyUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/tonnes-not-recycled`
const quarterlyUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/tonnes-not-recycled`

describe('#tonnesNotRecycledController', () => {
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

      it('should return 200 for reprocessor', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: monthlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display the heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: monthlyUrl,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document

        expect(
          getByRole(body, 'heading', {
            level: 1,
            name: /How many tonnes of plastic packaging waste did you receive in January 2026 but not recycle\?/
          })
        ).toBeDefined()
      })

      it('should display hint text', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: monthlyUrl,
          auth: mockAuth
        })

        expect(result).toContain(
          'Only include packaging waste that is still on the site'
        )
      })

      it('should pre-fill tonnage formatted to 2 decimal places', async ({
        server
      }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetailWithTonnage)

        const { result } = await server.inject({
          method: 'GET',
          url: monthlyUrl,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document
        const input = getByRole(body, 'textbox', {
          name: /How many tonnes of plastic packaging waste did you receive in January 2026 but not recycle/
        })

        expect(input.value).toBe('89.30')
      })

      it('should have back link to tonnes-recycled', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: monthlyUrl,
          auth: mockAuth
        })

        expect(result).toContain('/tonnes-recycled')
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
          url: monthlyUrl,
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

      describe('accredited monthly reprocessor', () => {
        it('should redirect to prn-summary on continue', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, monthlyUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: monthlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: {
              crumb,
              tonnageNotRecycled: 20,
              action: 'continue'
            }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/prn-summary`
          )
        })

        it('should call updateReport with tonnageNotRecycled', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, monthlyUrl, {
            auth: mockAuth
          })

          await server.inject({
            method: 'POST',
            url: monthlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: {
              crumb,
              tonnageNotRecycled: 20,
              action: 'continue'
            }
          })

          expect(updateReport).toHaveBeenCalledWith(
            organisationId,
            registrationId,
            2026,
            'monthly',
            1,
            { tonnageNotRecycled: 20 },
            'mock-id-token'
          )
        })
      })

      describe('registered-only quarterly reprocessor', () => {
        it('should redirect to supporting-information on continue', async ({
          server
        }) => {
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            registeredOnlyReprocessor
          )

          const { cookie, crumb } = await getCsrfToken(server, quarterlyUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: quarterlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: {
              crumb,
              tonnageNotRecycled: 10,
              action: 'continue'
            }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/supporting-information`
          )
        })
      })

      describe('when save is clicked', () => {
        it('should redirect to reports list', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, monthlyUrl, {
            auth: mockAuth
          })

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: monthlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageNotRecycled: 0, action: 'save' }
          })

          expect(statusCode).toBe(statusCodes.found)
          expect(headers.location).toBe(
            `/organisations/${organisationId}/registrations/${registrationId}/reports`
          )
        })
      })

      describe('validation errors', () => {
        it('should show error when tonnage is empty', async ({ server }) => {
          const { cookie, crumb } = await getCsrfToken(server, monthlyUrl, {
            auth: mockAuth
          })

          const { result } = await server.inject({
            method: 'POST',
            url: monthlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageNotRecycled: '', action: 'continue' }
          })

          const { body } = new JSDOM(result).window.document
          const alert = getByRole(body, 'alert')

          expect(
            getByText(
              alert,
              /Enter the total tonnage of packaging waste received but not recycled/
            )
          ).toBeDefined()
        })

        it('should show error when tonnage is non-numeric', async ({
          server
        }) => {
          const { cookie, crumb } = await getCsrfToken(server, monthlyUrl, {
            auth: mockAuth
          })

          const { result } = await server.inject({
            method: 'POST',
            url: monthlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageNotRecycled: 'abc', action: 'continue' }
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
          const { cookie, crumb } = await getCsrfToken(server, monthlyUrl, {
            auth: mockAuth
          })

          const { result } = await server.inject({
            method: 'POST',
            url: monthlyUrl,
            auth: mockAuth,
            headers: { cookie },
            payload: { crumb, tonnageNotRecycled: 12.345, action: 'continue' }
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
        url: monthlyUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
