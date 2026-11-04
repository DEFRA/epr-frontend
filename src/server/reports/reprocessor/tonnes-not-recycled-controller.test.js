import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import {
  buildRegistrationView,
  buildRegistrationWithAccreditation
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { asReportDetailResponse } from '#server/common/test-helpers/report-fixtures.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-with-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('../helpers/update-report.js'))

const { updateReport } = await import('../helpers/update-report.js')

const mockCredentials = buildMockAuth().credentials

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const reprocessorView = buildRegistrationView({
  wasteProcessingType: 'reprocessor'
})

const reprocessorRegistration = buildRegistrationWithAccreditation({
  registration: reprocessorView
})

const registeredOnlyReprocessor = buildRegistrationWithAccreditation({
  registration: { ...reprocessorView, accreditations: {} }
})

const reportDetail = {
  operatorCategory: 'REPROCESSOR_ACCREDITED',
  cadence: 'monthly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-02-15T15:09:00.000Z' },
  details: { material: 'plastic' },
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

const organisationNumber = '500001'
const registrationNumber = 'R25SR500030912PA'
const monthlyUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/accreditations/2026/reports/monthly/1/submissions/1/tonnes-not-recycled`
const quarterlyUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/reports/2026/quarterly/1/submissions/1/tonnes-not-recycled`

describe('#tonnesNotRecycledController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationWithAccreditation).mockResolvedValue(
        reprocessorRegistration
      )
      vi.mocked(fetchReportDetail).mockResolvedValue(
        asReportDetailResponse(reportDetail)
      )
    })

    it('should return 200 for reprocessor', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: monthlyUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
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

    it('should display the Create draft report caption', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: monthlyUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const caption = body.querySelector('.govuk-caption-xl')

      expect(caption).not.toBeNull()
      expect(caption?.textContent?.trim()).toBe('Create draft report')
    })

    it('should display heading and pre-fill saved tonnage unchanged', async ({
      server
    }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(
        asReportDetailResponse({
          ...reportDetail,
          recyclingActivity: {
            ...reportDetail.recyclingActivity,
            tonnageNotRecycled: 89.3
          }
        })
      )

      const { result } = await server.inject({
        method: 'GET',
        url: monthlyUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const headingName =
        /How many tonnes of plastic packaging waste did you receive in January but not recycle\?/

      expect(
        getByRole(body, 'heading', { level: 1, name: headingName })
      ).toBeDefined()
      expect(getByRole(body, 'textbox', { name: headingName }).value).toBe(
        '89.3'
      )
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
      vi.mocked(fetchReportDetail).mockResolvedValue(
        asReportDetailResponse({
          ...reportDetail,
          status: 'ready_to_submit'
        })
      )

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
      vi.mocked(fetchRegistrationWithAccreditation).mockResolvedValue(
        reprocessorRegistration
      )
      vi.mocked(fetchReportDetail).mockResolvedValue(
        asReportDetailResponse(reportDetail)
      )
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
          `/organisations/${organisationNumber}/registrations/${registrationNumber}/accreditations/2026/reports/monthly/1/submissions/1/prn-summary`
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
          {
            organisationNumber,
            registrationNumber,
            year: 2026,
            cadence: 'monthly',
            period: 1,
            submissionNumber: 1
          },
          { tonnageNotRecycled: 20 },
          'mock-backend-token'
        )
      })
    })

    describe('registered-only quarterly reprocessor', () => {
      it('should redirect to supporting-information on continue', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationWithAccreditation).mockResolvedValue(
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
          `/organisations/${organisationNumber}/registrations/${registrationNumber}/reports/2026/quarterly/1/submissions/1/supporting-information`
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
          `/organisations/${organisationNumber}/registrations/${registrationNumber}/reports/2026`
        )
      })

      it('should redirect to reports list when tonnage is empty', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, monthlyUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: monthlyUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, tonnageNotRecycled: '', action: 'save' }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationNumber}/registrations/${registrationNumber}/reports/2026`
        )
      })

      it('should not call updateReport when tonnage is empty', async ({
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
          payload: { crumb, tonnageNotRecycled: '', action: 'save' }
        })

        expect(updateReport).not.toHaveBeenCalled()
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
          payload: { crumb, tonnageNotRecycled: 'abc', action: 'save' }
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
